import {
  type PublishSessionInput,
  type PublishSessionResult,
} from '@gutenberg/core';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { env } from '@/env';
import {
  estimate_irys_publish_cost,
  estimate_solana_publish_cost,
  format_lamports_as_sol,
  type IrysCostEstimate,
  type SolanaCostEstimate,
} from '@/lib/publish-cost';
import {
  type PublishFlowEvent,
  run_publish_flow,
} from '@/lib/publish-flow';
import {
  fetch_session_input,
  post_session_error,
  post_session_progress,
  post_session_result,
  read_session_config_from_url,
  type SessionConfig,
} from '@/lib/publish-session-client';

type LoadState =
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      session: PublishSessionInput;
      cfg: SessionConfig;
    };

type RunState =
  | { kind: 'idle' }
  | { kind: 'running'; events: PublishFlowEvent[] }
  | {
      kind: 'success';
      events: PublishFlowEvent[];
      result: PublishSessionResult;
    }
  | { kind: 'failed'; events: PublishFlowEvent[]; message: string };

const NO_SESSION_MESSAGE =
  'No publish session found in the URL. Run `gutenberg publish` from your terminal — it will open this page with the session attached.';

export function PublishRoute() {
  const wallet = useWallet();
  const cfg = useMemo(
    () =>
      read_session_config_from_url(
        new URL(window.location.href),
      ),
    [],
  );
  const [load, set_load] = useState<LoadState>(() =>
    cfg ? { kind: 'pending' } : { kind: 'error', message: NO_SESSION_MESSAGE },
  );
  const [run, set_run] = useState<RunState>({ kind: 'idle' });
  const fired_run_ref = useRef(false);

  useEffect(() => {
    if (!cfg) {
      return;
    }

    let cancelled = false;
    fetch_session_input(cfg)
      .then((session) => {
        if (cancelled) {
          return;
        }
        set_load({ kind: 'ready', session, cfg });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        set_load({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [cfg]);

  if (load.kind === 'pending') {
    return (
      <Container className="py-16">
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
          Loading publish session…
        </p>
      </Container>
    );
  }

  if (load.kind === 'error') {
    return (
      <Container className="py-16">
        <ErrorView
          title="Publish session unavailable"
          message={load.message}
        />
      </Container>
    );
  }

  const { session, cfg: session_cfg } = load;

  async function on_publish() {
    if (fired_run_ref.current) {
      return;
    }

    fired_run_ref.current = true;
    const events: PublishFlowEvent[] = [];
    set_run({ kind: 'running', events });

    try {
      const result = await run_publish_flow({
        session,
        wallet,
        irys_bundler_url: env.VITE_GUTENBERG_IRYS_GATEWAY,
        on_event: (event) => {
          events.push(event);
          set_run({ kind: 'running', events: [...events] });
          void post_session_progress(session_cfg, {
            kind: progress_kind(event),
            message: progress_message(event),
            ...(progress_meta(event)
              ? { meta: progress_meta(event)! }
              : {}),
          });
        },
      });

      const final_result: Omit<PublishSessionResult, 'protocol_version'> = {
        manifest_uri: result.manifest_uri,
        manifest_hash: result.manifest_hash,
        content_hash: result.manifest.content_hash,
        content_size_bytes: result.manifest.content_size_bytes,
        release_pda: result.release_pda,
        tx_signature: result.tx_signature,
        publisher: result.publisher,
      };

      await post_session_result(session_cfg, final_result);

      set_run({
        kind: 'success',
        events,
        result: { protocol_version: 1, ...final_result },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set_run({ kind: 'failed', events, message });
      void post_session_error(session_cfg, { kind: 'failed', message });
    } finally {
      fired_run_ref.current = false;
    }
  }

  function on_cancel() {
    void post_session_error(session_cfg, {
      kind: 'cancelled',
      message: 'User cancelled from the browser',
    });
    set_run({
      kind: 'failed',
      events: run.kind === 'idle' ? [] : run.events,
      message: 'Cancelled',
    });
  }

  return (
    <Container className="grid gap-10 py-16 lg:py-24">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Gutenberg gateway · publish
        </p>
        <h1 className="text-[2.25rem] font-semibold leading-none tracking-[-0.03em] text-foreground sm:text-[2.75rem]">
          Sign and publish&nbsp;
          <span className="font-mono text-[0.85em] tabular text-muted-foreground">
            {session.name}@{session.version}
          </span>
          .
        </h1>
        <p className="max-w-[58ch] text-[15px] leading-[1.55] text-foreground-soft">
          Connect a Solana wallet (Phantom, Solflare, Backpack, etc.). The browser uploads the bundle to Irys, signs the
          manifest with your key, and registers the release on Solana. Your
          terminal is waiting for the result.
        </p>
      </header>

      <SessionSummary session={session} />

      <CostPreview session={session} />

      <section className="grid gap-5 rounded-2xl border border-border bg-card/50 p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="grid gap-1">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Wallet
            </p>
            <p className="font-mono text-[13px] tabular text-foreground">
              {wallet.publicKey
                ? wallet.publicKey.toBase58()
                : 'Not connected'}
            </p>
          </div>
          <WalletMultiButton style={wallet_button_style} />
        </div>

        <FlowProgress events={run.kind === 'idle' ? [] : run.events} />

        {run.kind === 'failed' ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
            {run.message}
          </div>
        ) : null}

        {run.kind === 'success' ? (
          <SuccessView
            result={run.result}
            name={session.name}
            version={session.version}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void on_publish()}
              disabled={
                !wallet.connected ||
                !wallet.signMessage ||
                run.kind === 'running'
              }
            >
              {run.kind === 'running' ? 'Publishing…' : 'Publish release'}
            </Button>
            {run.kind === 'running' ? (
              <Button variant="outline" onClick={on_cancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </Container>
  );
}

type SolanaCostState =
  | { kind: 'pending' }
  | { kind: 'success'; data: SolanaCostEstimate }
  | { kind: 'error'; message: string };

type IrysCostState =
  | { kind: 'pending' }
  | { kind: 'success'; data: IrysCostEstimate }
  | { kind: 'error'; message: string };

function CostPreview({ session }: { session: PublishSessionInput }) {
  const [solana, set_solana] = useState<SolanaCostState>({ kind: 'pending' });
  const [irys, set_irys] = useState<IrysCostState>({ kind: 'pending' });

  useEffect(() => {
    let cancelled = false;

    estimate_solana_publish_cost({
      rpc_url: session.rpc_url,
      name: session.name,
      program_id: session.chain.program_id,
    })
      .then((data) => {
        if (!cancelled) {
          set_solana({ kind: 'success', data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          set_solana({
            kind: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    estimate_irys_publish_cost({
      bundler_url: env.VITE_GUTENBERG_IRYS_GATEWAY,
      session,
    })
      .then((data) => {
        if (!cancelled) {
          set_irys({ kind: 'success', data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          set_irys({
            kind: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const total_lamports =
    solana.kind === 'success' && irys.kind === 'success'
      ? BigInt(solana.data.total_lamports) + BigInt(irys.data.price_atomic)
      : undefined;

  return (
    <section className="grid gap-5 rounded-2xl border border-border bg-card/40 p-6">
      <div className="grid gap-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Estimated cost
        </p>
        <p className="text-[13px] text-foreground-soft">
          Paid by your connected wallet. Irys covers permanent storage; Solana
          covers rent for the new release account
          {solana.kind === 'success' && solana.data.creates_name_authority
            ? ' plus a one-time name-authority account'
            : ''}{' '}
          plus a 5,000-lamport base fee.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CostRow
          label="Irys upload"
          state={irys}
          render={(data) => (
            <>
              <span>{format_lamports_as_sol(BigInt(data.price_atomic))} SOL</span>
              <span className="text-muted-foreground">
                {' '}
                · {format_bytes(data.bytes)} ({format_bytes(data.files_bytes)}{' '}
                files + {format_bytes(data.manifest_bytes)} manifest)
              </span>
            </>
          )}
        />
        <CostRow
          label="Solana transaction"
          state={solana}
          render={(data) => (
            <>
              <span>{format_lamports_as_sol(data.total_lamports)} SOL</span>
              <span className="text-muted-foreground">
                {' '}
                · rent {format_lamports_as_sol(
                  data.release_rent_lamports + data.name_authority_rent_lamports,
                )}{' '}
                + fee {format_lamports_as_sol(data.base_fee_lamports)}
                {data.creates_name_authority ? ' · first release for name' : ''}
              </span>
            </>
          )}
        />
      </div>

      <div className="grid gap-1 border-t border-border pt-4">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Total
        </p>
        <p className="font-mono text-[15px] tabular text-foreground">
          {total_lamports !== undefined
            ? `~${format_lamports_as_sol(total_lamports)} SOL`
            : irys.kind === 'error' || solana.kind === 'error'
              ? 'unavailable'
              : 'estimating…'}
        </p>
      </div>
    </section>
  );
}

function CostRow<T>({
  label,
  state,
  render,
}: {
  label: string;
  state:
    | { kind: 'pending' }
    | { kind: 'success'; data: T }
    | { kind: 'error'; message: string };
  render: (data: T) => React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      {state.kind === 'pending' ? (
        <p className="font-mono text-[13px] tabular text-muted-foreground">
          estimating…
        </p>
      ) : state.kind === 'error' ? (
        <p
          className="font-mono text-[12.5px] tabular text-destructive"
          title={state.message}
        >
          unavailable: {state.message}
        </p>
      ) : (
        <p className="font-mono text-[13px] tabular text-foreground">
          {render(state.data)}
        </p>
      )}
    </div>
  );
}

function SessionSummary({ session }: { session: PublishSessionInput }) {
  const total_bytes = session.files.reduce((acc, f) => acc + f.size_bytes, 0);

  return (
    <section className="grid gap-5 rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Name" value={session.name} mono />
        <Field label="Version" value={session.version} mono />
        <Field label="Entry" value={session.entry} mono />
        <Field label="Chain" value={session.chain.chain_id} mono />
        <Field label="Program" value={session.chain.program_id} mono truncate />
        <Field label="Irys network" value={session.irys_network} mono />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Files" value={String(session.files.length)} />
        <Field label="Bytes" value={format_bytes(total_bytes)} />
        <Field label="RPC" value={session.rpc_url} truncate />
      </div>
      {session.tags && session.tags.length > 0 ? (
        <Field label="Tags" value={session.tags.join(', ')} />
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-[13px] text-foreground ${
          mono ? 'font-mono tabular' : ''
        } ${truncate ? 'truncate' : ''}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function FlowProgress({ events }: { events: PublishFlowEvent[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <ol className="grid gap-1 rounded-xl border border-border bg-background px-4 py-3 text-[12.5px]">
      {events.map((event, idx) => (
        <li
          key={`${event.kind}-${idx}`}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3 font-mono tabular"
        >
          <span className="text-muted-foreground">
            {String(idx + 1).padStart(2, '0')}
          </span>
          <span className="text-foreground-soft">
            {progress_message(event)}
          </span>
        </li>
      ))}
    </ol>
  );
}

const REDIRECT_AFTER_SECONDS = 5;

function SuccessView({
  result,
  name,
  version,
}: {
  result: PublishSessionResult;
  name: string;
  version: string;
}) {
  const navigate = useNavigate();
  const target = `/r/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  const [seconds_left, set_seconds_left] = useState(REDIRECT_AFTER_SECONDS);

  useEffect(() => {
    if (seconds_left <= 0) {
      navigate(target);
      return;
    }

    const handle = setTimeout(
      () => set_seconds_left((s) => s - 1),
      1000,
    );

    return () => clearTimeout(handle);
  }, [seconds_left, navigate, target]);

  return (
    <div className="grid gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-4 text-[13px]">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-accent">
        Published
      </p>
      <Field label="Manifest" value={result.manifest_uri} mono truncate />
      <Field label="Manifest hash" value={result.manifest_hash} mono truncate />
      <Field label="Release PDA" value={result.release_pda} mono truncate />
      <Field label="Tx signature" value={result.tx_signature} mono truncate />
      <p className="text-foreground-soft">
        Opening your release in {seconds_left}s…{' '}
        <Link
          to={target}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          go now
        </Link>
        .
      </p>
    </div>
  );
}

const wallet_button_style: React.CSSProperties = {
  background: 'var(--foreground)',
  color: 'var(--background)',
  borderRadius: '0.5rem',
  height: '2.25rem',
  padding: '0 0.875rem',
  fontSize: '13px',
  fontFamily: 'inherit',
  fontWeight: 500,
};

function format_bytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function progress_kind(
  event: PublishFlowEvent,
): 'wallet_connected' | 'upload_started' | 'upload_complete' | 'tx_sent' {
  switch (event.kind) {
    case 'wallet_connected':
      return 'wallet_connected';
    case 'uploading_bundle':
      return 'upload_started';
    case 'manifest_uploaded':
      return 'upload_complete';
    case 'tx_sending':
    case 'tx_confirmed':
      return 'tx_sent';
    default:
      return 'upload_started';
  }
}

function progress_message(event: PublishFlowEvent): string {
  switch (event.kind) {
    case 'preparing':
      return 'Preparing Irys client…';
    case 'wallet_connected':
      return `Connected wallet ${truncate(event.address, 12)}`;
    case 'fund_required':
      return `Funding required: ${event.amount_atomic} atomic units for ${event.bytes} bytes`;
    case 'funding':
      return 'Awaiting wallet confirmation for Irys funding tx…';
    case 'funded':
      return 'Irys balance topped up.';
    case 'manifest_signing':
      return 'Awaiting wallet signature on manifest…';
    case 'uploading_bundle':
      return `Awaiting wallet signature on Irys bundle (${event.total} item${event.total === 1 ? '' : 's'})…`;
    case 'manifest_uploaded':
      return `Manifest uploaded: ${event.manifest_uri}`;
    case 'tx_sending':
      return 'Awaiting wallet confirmation on Solana publish_release tx…';
    case 'tx_confirmed':
      return `Solana tx confirmed: ${truncate(event.signature, 16)}`;
  }
}

function progress_meta(
  event: PublishFlowEvent,
): Record<string, string | number | boolean> | undefined {
  switch (event.kind) {
    case 'wallet_connected':
      return { address: event.address };
    case 'manifest_uploaded':
      return { manifest_uri: event.manifest_uri };
    case 'tx_confirmed':
      return { signature: event.signature };
    default:
      return undefined;
  }
}

function truncate(value: string, head: number): string {
  if (value.length <= head + 4) {
    return value;
  }
  return `${value.slice(0, head)}…${value.slice(-4)}`;
}
