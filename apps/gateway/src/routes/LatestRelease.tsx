import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
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

  const [last_valid_name, set_last_valid_name] = useState(valid_name);
  if (last_valid_name !== valid_name) {
    set_last_valid_name(valid_name);
    set_state({ status: 'loading' });
  }

  useEffect(() => {
    if (!valid_name) return;

    let cancelled = false;

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
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="That name doesn't look right"
          message={`"${name ?? ''}" isn't a valid release name. Names use lowercase letters, numbers, dots, underscores, or hyphens.`}
        />
      </Container>
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
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Couldn't find the latest version"
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
            Finding the latest version
          </p>
          <h2 className="text-[26px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[32px]">
            {name}
          </h2>
          <p className="max-w-[60ch] text-[15px] leading-[1.6] text-foreground-soft">
            Asking Solana for the most recent release of this name.
          </p>
        </div>
      </div>
    </Container>
  );
}
