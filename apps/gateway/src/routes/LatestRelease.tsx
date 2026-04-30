import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { env } from '@/env';
import { find_latest_release_by_name } from '@/lib/registry';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; version: string };

export function LatestReleaseRoute() {
  const params = useParams();
  const name = params.name;
  const [state, set_state] = useState<State>({ status: 'loading' });

  const valid_name = name && NAME_RE.test(name) ? name : undefined;

  useEffect(() => {
    if (!valid_name) return;

    let cancelled = false;
    set_state({ status: 'loading' });

    void (async () => {
      try {
        const release = await find_latest_release_by_name({
          rpc_url: env.VITE_GUTENBERG_SOLANA_RPC_URL,
          program_id: env.VITE_GUTENBERG_REGISTRY_PROGRAM_ID,
          name: valid_name,
        });
        if (cancelled) return;

        if (!release) {
          set_state({
            status: 'error',
            message: `No releases found for "${valid_name}".`,
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
  }, [valid_name]);

  if (!name || !NAME_RE.test(name)) {
    return (
      <ErrorView
        title="Invalid release name"
        message={`"${name ?? ''}" is not a valid release name.`}
      />
    );
  }

  if (state.status === 'success') {
    return (
      <Navigate
        replace
        to={`/r/${encodeURIComponent(name)}/${encodeURIComponent(state.version)}`}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <ErrorView
        title="Could not resolve latest release"
        message={state.message}
      />
    );
  }

  return (
    <section
      aria-live="polite"
      className="grid items-start gap-6 border-y border-border/70 py-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12"
    >
      <div className="inline-flex size-12 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground">
        <Loader2 className="size-5 animate-spin" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="grid gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Resolving latest version
        </p>
        <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] sm:text-[30px]">
          {name}
        </h2>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
          Looking up the most recent release on the Solana registry.
        </p>
      </div>
    </section>
  );
}
