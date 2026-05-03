import { useEffect, useReducer } from 'react';

import { env } from '@/env';
import type { ContentUri, VerifiedRelease } from '@/lib/types';
import {
  assemble_verified_release,
  resolve_release,
  verify_manifest_uri,
} from '@/lib/verify';
import type { VerifyStep, VerifyStepState } from '@/components/VerifyStatus';

/** Minimum time the work phase runs before we start the success checklist. */
const MIN_VERIFY_SHELL_MS = 380;

/** Pause between each animated step completing (registry → manifest → index). */
const STAGGER_BETWEEN_STEPS_MS = 260;

/** Hold on “all checks passed” before swapping to the publication view. */
const AFTER_ALL_CHECKS_MS = 480;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type ReleaseSource = {
  name: string;
  version: string;
};

type State = {
  status: 'loading' | 'success' | 'error';
  steps: VerifyStep[];
  error?: string;
  result?: VerifiedRelease;
  partial_manifest_uri?: ContentUri;
};

type Action =
  | {
      kind: 'step';
      id: string;
      state: VerifyStepState;
      label?: string;
      detail?: string;
    }
  | { kind: 'partial_manifest_uri'; uri: ContentUri }
  | { kind: 'success'; result: VerifiedRelease }
  | {
      kind: 'error';
      message: string;
      failing_step_id?: string;
      completed_before_fail?: ReadonlyArray<{ id: string; detail: string }>;
    };

const INITIAL_STEPS: readonly VerifyStep[] = [
  { id: 'registry', label: 'Looking up the publication on chain', state: 'pending' },
  {
    id: 'manifest',
    label: 'Checking the manifest signature',
    state: 'pending',
  },
  {
    id: 'index',
    label: 'Hashing the file index',
    state: 'pending',
  },
];

function reducer(state: State, action: Action): State {
  if (action.kind === 'step') {
    return {
      ...state,
      steps: state.steps.map((step) =>
        step.id === action.id
          ? {
              ...step,
              state: action.state,
              label: action.label ?? step.label,
              detail: action.detail ?? step.detail,
            }
          : step,
      ),
    };
  }

  if (action.kind === 'partial_manifest_uri') {
    return { ...state, partial_manifest_uri: action.uri };
  }

  if (action.kind === 'success') {
    return { ...state, status: 'success', result: action.result };
  }

  return {
    ...state,
    status: 'error',
    error: action.message,
    steps: state.steps.map((step) => {
      const done = action.completed_before_fail?.find((c) => c.id === step.id);
      if (done) {
        return { ...step, state: 'success', detail: done.detail };
      }
      if (action.failing_step_id && step.id === action.failing_step_id) {
        return { ...step, state: 'error', detail: undefined };
      }
      return { ...step, state: 'pending', detail: undefined };
    }),
  };
}

export function useVerifiedRelease(source: ReleaseSource): State {
  const [state, dispatch] = useReducer(reducer, {
    status: 'loading',
    steps: INITIAL_STEPS.map((step) => ({ ...step })),
  });

  const source_key = `${source.name}@${source.version}`;

  useEffect(() => {
    let cancelled = false;
    const ctx = {
      rpc_url: env.VITE_GUTENBERG_SOLANA_RPC_URL,
      irys_gateway: env.VITE_GUTENBERG_IRYS_GATEWAY,
      arweave_mirrors: env.VITE_GUTENBERG_ARWEAVE_MIRRORS,
      program_id: env.VITE_GUTENBERG_REGISTRY_PROGRAM_ID,
    };

    void (async () => {
      const t0 = performance.now();

      let release: Awaited<ReturnType<typeof resolve_release>>['release'];
      let release_address: string;

      try {
        const out = await resolve_release(
          { name: source.name, version: source.version },
          ctx,
        );
        release = out.release;
        release_address = out.release_address;
      } catch (err) {
        if (cancelled) return;
        dispatch({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
          failing_step_id: 'registry',
        });
        return;
      }
      if (cancelled) return;

      dispatch({ kind: 'partial_manifest_uri', uri: release.manifest });

      let manifest: Awaited<ReturnType<typeof verify_manifest_uri>>['manifest'];

      try {
        const out = await verify_manifest_uri({
          expected_release: release,
          ctx,
        });
        manifest = out.manifest;
      } catch (err) {
        if (cancelled) return;
        dispatch({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
          failing_step_id: 'manifest',
          completed_before_fail: [
            {
              id: 'registry',
              detail: `${release.name}@${release.version}`,
            },
          ],
        });
        return;
      }
      if (cancelled) return;

      let verified: VerifiedRelease;

      try {
        verified = assemble_verified_release({
          release,
          release_address,
          manifest,
        });
      } catch (err) {
        if (cancelled) return;
        dispatch({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
          failing_step_id: 'index',
          completed_before_fail: [
            {
              id: 'registry',
              detail: `${release.name}@${release.version}`,
            },
            { id: 'manifest', detail: short_uri(release.manifest) },
          ],
        });
        return;
      }
      if (cancelled) return;

      const elapsed = performance.now() - t0;
      await delay(Math.max(0, MIN_VERIFY_SHELL_MS - elapsed));
      if (cancelled) return;

      const d_registry = `${release.name}@${release.version}`;
      const d_manifest = short_uri(release.manifest);
      const d_index = `${verified.files.size} files`;

      dispatch({
        kind: 'step',
        id: 'registry',
        state: 'success',
        detail: d_registry,
      });
      await delay(STAGGER_BETWEEN_STEPS_MS);
      if (cancelled) return;

      dispatch({
        kind: 'step',
        id: 'manifest',
        state: 'success',
        detail: d_manifest,
      });
      await delay(STAGGER_BETWEEN_STEPS_MS);
      if (cancelled) return;

      dispatch({
        kind: 'step',
        id: 'index',
        state: 'success',
        detail: d_index,
      });
      await delay(AFTER_ALL_CHECKS_MS);
      if (cancelled) return;

      dispatch({ kind: 'success', result: verified });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-run only on source change
  }, [source_key]);

  return state;
}

function short_uri(uri: string): string {
  if (uri.length <= 64) {
    return uri;
  }

  return `${uri.slice(0, 28)}…${uri.slice(-24)}`;
}
