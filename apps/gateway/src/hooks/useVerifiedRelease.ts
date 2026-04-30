import { useEffect, useReducer } from 'react';

import { env } from '@/env';
import type { GutenbergReleaseEvent, VerifiedRelease } from '@/lib/types';
import {
  resolve_release_event,
  verify_bundle,
  verify_manifest_uri,
} from '@/lib/verify';
import type { VerifyStep, VerifyStepState } from '@/components/VerifyStatus';

type ReleaseSource =
  | {
      kind: 'release';
      name: string;
      version?: string;
      publisher?: string;
    }
  | {
      kind: 'manifest';
      manifest_uri: string;
    };

type State = {
  status: 'loading' | 'success' | 'error';
  steps: VerifyStep[];
  error?: string;
  result?: VerifiedRelease;
};

type Action =
  | { kind: 'reset' }
  | {
      kind: 'step';
      id: string;
      state: VerifyStepState;
      label?: string;
      detail?: string;
    }
  | { kind: 'success'; result: VerifiedRelease }
  | { kind: 'error'; message: string; failing_step_id?: string };

const INITIAL_STEPS_RELEASE: readonly VerifyStep[] = [
  {
    id: 'registry',
    label: 'Resolving registry release',
    state: 'pending',
  },
  { id: 'manifest', label: 'Fetching + verifying manifest', state: 'pending' },
  { id: 'bundle', label: 'Verifying bundle + file hashes', state: 'pending' },
];

const INITIAL_STEPS_MANIFEST: readonly VerifyStep[] = [
  { id: 'manifest', label: 'Fetching + verifying manifest', state: 'pending' },
  { id: 'bundle', label: 'Verifying bundle + file hashes', state: 'pending' },
];

function reducer(state: State, action: Action): State {
  if (action.kind === 'reset') {
    return state;
  }

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

export function useVerifiedRelease(source: ReleaseSource | undefined): State {
  const initial_steps =
    source?.kind === 'manifest'
      ? INITIAL_STEPS_MANIFEST
      : INITIAL_STEPS_RELEASE;

  const [state, dispatch] = useReducer(reducer, {
    status: 'loading',
    steps: initial_steps.map((step) => ({ ...step })),
  });

  const source_key = source ? source_to_key(source) : 'none';

  useEffect(() => {
    if (!source) {
      return;
    }

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
        let manifest_uri: string;
        let expected_release: GutenbergReleaseEvent | undefined;
        let release_pda: string | undefined;

        if (source.kind === 'release') {
          begin_step('registry');
          const resolved = await resolve_release_event(
            {
              name: source.name,
              version: source.version,
              publisher: source.publisher,
            },
            ctx,
          );
          if (cancelled) return;

          manifest_uri = resolved.release.manifest;
          expected_release = resolved.release;
          release_pda = resolved.release_pda;
          finish_step(
            'registry',
            `${resolved.release.name}@${resolved.release.version}`,
          );
        } else {
          manifest_uri = source.manifest_uri;
        }

        begin_step('manifest');
        const { manifest } = await verify_manifest_uri({
          manifest_uri,
          expected_release,
          ctx,
        });
        if (cancelled) return;
        finish_step('manifest', short_uri(manifest_uri));

        begin_step('bundle');
        const files = await verify_bundle({ manifest, ctx });
        if (cancelled) return;
        finish_step('bundle', `${files.size} files`);

        const result: VerifiedRelease = {
          manifest,
          manifest_uri,
          release_pda,
          files,
        };

        dispatch({ kind: 'success', result });
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

function source_to_key(source: ReleaseSource): string {
  if (source.kind === 'manifest') {
    return `manifest:${source.manifest_uri}`;
  }

  return `release:${source.name}@${source.version ?? '*'}|${source.publisher ?? '*'}`;
}

function short_uri(uri: string): string {
  if (uri.length <= 64) {
    return uri;
  }

  return `${uri.slice(0, 28)}…${uri.slice(-24)}`;
}
