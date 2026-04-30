import { useEffect, useReducer } from 'react';

import { env } from '@/env';
import type { VerifiedRelease } from '@/lib/types';
import { resolve_release, verify_bundle, verify_manifest_uri } from '@/lib/verify';
import type { VerifyStep, VerifyStepState } from '@/components/VerifyStatus';

export type ReleaseSource = {
  name: string;
  version: string;
};

type State = {
  status: 'loading' | 'success' | 'error';
  steps: VerifyStep[];
  error?: string;
  result?: VerifiedRelease;
};

type Action =
  | {
      kind: 'step';
      id: string;
      state: VerifyStepState;
      label?: string;
      detail?: string;
    }
  | { kind: 'success'; result: VerifiedRelease }
  | { kind: 'error'; message: string; failing_step_id?: string };

const INITIAL_STEPS: readonly VerifyStep[] = [
  { id: 'registry', label: 'Resolving registry release', state: 'pending' },
  { id: 'manifest', label: 'Fetching + verifying manifest', state: 'pending' },
  { id: 'bundle', label: 'Verifying bundle + file hashes', state: 'pending' },
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

  if (action.kind === 'success') {
    return { ...state, status: 'success', result: action.result };
  }

  return {
    ...state,
    status: 'error',
    error: action.message,
    steps: state.steps.map((step) =>
      step.id === action.failing_step_id ? { ...step, state: 'error' } : step,
    ),
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
    let current_step_id: string | undefined;
    const ctx = {
      rpc_url: env.VITE_GUTENBERG_SOLANA_RPC_URL,
      arweave_gateway: env.VITE_GUTENBERG_ARWEAVE_GATEWAY,
      program_id: env.VITE_GUTENBERG_REGISTRY_PROGRAM_ID,
    };

    const begin_step = (id: string) => {
      current_step_id = id;
      dispatch({ kind: 'step', id, state: 'running' });
    };
    const finish_step = (id: string, detail?: string) => {
      dispatch({ kind: 'step', id, state: 'success', detail });
    };

    void (async () => {
      try {
        begin_step('registry');
        const { release, release_pda } = await resolve_release(
          { name: source.name, version: source.version },
          ctx,
        );
        if (cancelled) return;
        finish_step('registry', `${release.name}@${release.version}`);

        begin_step('manifest');
        const { manifest } = await verify_manifest_uri({
          manifest_uri: release.manifest,
          expected_release: release,
          ctx,
        });
        if (cancelled) return;
        finish_step('manifest', short_uri(release.manifest));

        begin_step('bundle');
        const files = await verify_bundle({ manifest, ctx });
        if (cancelled) return;
        finish_step('bundle', `${files.size} files`);

        dispatch({
          kind: 'success',
          result: {
            manifest,
            manifest_uri: release.manifest,
            release_pda,
            files,
          },
        });
      } catch (err) {
        if (cancelled) return;
        dispatch({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
          failing_step_id: current_step_id,
        });
      }
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
