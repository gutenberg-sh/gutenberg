import {
  GUTENBERG_REGISTRY_PROGRAM_ID,
  REGISTRY_ID_RE,
  find_latest_release_by_registry_id,
} from '@gutenberg/core';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { env } from '@/env';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; version: string };

export function LatestReleaseRoute() {
  const params = useParams();
  const registry_id = params.registry_id;
  const [state, set_state] = useState<State>({ status: 'loading' });

  const valid_registry_id =
    registry_id && REGISTRY_ID_RE.test(registry_id) ? registry_id : undefined;

  const [last_valid, set_last_valid] = useState(valid_registry_id);
  if (last_valid !== valid_registry_id) {
    set_last_valid(valid_registry_id);
    set_state({ status: 'loading' });
  }

  useEffect(() => {
    if (!valid_registry_id) return;

    let cancelled = false;

    void (async () => {
      try {
        const release = await find_latest_release_by_registry_id({
          rpc_url: env.VITE_GUTENBERG_SOLANA_RPC_URL,
          program_id: GUTENBERG_REGISTRY_PROGRAM_ID,
          registry_id: valid_registry_id,
        });
        if (cancelled) return;

        if (!release) {
          set_state({
            status: 'error',
            message: `No releases found for registry id "${valid_registry_id}".`,
          });
          return;
        }

        set_state({ status: 'success', version: release.version });
      } catch (err) {
        if (cancelled) return;
        set_state({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [valid_registry_id]);

  if (!registry_id || !REGISTRY_ID_RE.test(registry_id)) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="That registry id doesn't look right"
          message={`"${registry_id ?? ''}" isn't a valid registry id. Use lowercase letters, numbers, dots, underscores, or hyphens.`}
        />
      </Container>
    );
  }

  if (state.status === 'success') {
    return (
      <Navigate
        replace
        to={`/publication/${encodeURIComponent(registry_id)}/${encodeURIComponent(state.version)}`}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Couldn't find the latest release"
          message={state.message}
        />
      </Container>
    );
  }

  return (
    <Container as="section" className="py-20 lg:py-28">
      <div
        aria-live="polite"
        className="grid items-start gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-7"
      >
        <Loader2
          className="size-5 animate-spin text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="grid gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Finding the latest release
          </p>
          <h2 className="text-[26px] font-semibold leading-[1.16] tracking-tight text-foreground sm:text-[32px]">
            {registry_id}
          </h2>
          <p className="max-w-[60ch] text-[15px] leading-[1.68] text-foreground-soft">
            Asking Solana for the most recent release for this publication
            (registry id).
          </p>
        </div>
      </div>
    </Container>
  );
}
