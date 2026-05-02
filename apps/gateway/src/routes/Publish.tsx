import {
  type PublishSessionInput,
  type PublishSessionResult,
} from '@gutenberg/core';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { env } from '@/env';
import { format_bytes, shorten } from '@/lib/format';
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
import { cn } from '@/lib/utils';

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
  "We didn't find a publish session in the URL. Run `gutenberg publish` from your terminal — it opens this page with the session attached.";

export function PublishRoute() {
  const wallet = useWallet();
  const cfg = useMemo(
    () => read_session_config_from_url(new URL(window.location.href)),
    [],
  );
  const [load, set_load] = useState<LoadState>(() =>
    cfg ? { kind: 'pending' } : { kind: 'error', message: NO_SESSION_MESSAGE },
  );
  const [run, set_run] = useState<RunState>({ kind: 'idle' });
  const fired_run_ref = useRef(false);

  useEffect(() => {
    if (!cfg) return;

    let cancelled = false;
    fetch_session_input(cfg)
      .then((session) => {
        if (cancelled) return;
        set_load({ kind: 'ready', session, cfg });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
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
      <Container className="grid gap-4 py-20 lg:py-28">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Loading your publish session
        </p>
        <div className="grid gap-3" aria-busy>
          <div className="h-9 w-72 max-w-full animate-pulse rounded-md bg-muted" />
          <div className="h-3.5 w-2/3 max-w-md animate-pulse rounded-md bg-muted/70" />
        </div>
      </Container>
    );
  }

  if (load.kind === 'error') {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView title="No publish session here" message={load.message} />
      </Container>
    );
  }

  const { session, cfg: session_cfg } = load;

  async function on_publish() {
    if (fired_run_ref.current) return;

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
        release_address: result.release_address,
        signature: result.signature,
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
    <Container className="grid gap-12 pb-24 pt-12 lg:gap-14 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Publish · npm-style permanence
        </p>
        <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
          Ship a version that never unpublishes.
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-foreground-soft">
          The CLI hands off to this page the same way publish flows feel on a
          registry: review the manifest, connect the wallet that owns the name,
          pay storage once, and the package becomes independently verifiable.
        </p>
      </header>

      <Identity session={session} />

      <Cost session={session} />

      <Action
        session={session}
        wallet_pubkey={wallet.publicKey?.toBase58() ?? null}
        wallet_connected={Boolean(wallet.connected && wallet.signMessage)}
        run={run}
        on_publish={() => void on_publish()}
        on_cancel={on_cancel}
      />

      <Advanced session={session} />
    </Container>
  );
}

function Identity({ session }: { session: PublishSessionInput }) {
  const total_bytes = session.files.reduce((acc, f) => acc + f.size_bytes, 0);

  return (
    <section
      aria-label="Release identity"
      className="grid gap-4 border-y border-border py-7"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
        About to publish
      </p>
      <h2 className="text-[1.625rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2rem]">
        <span>{session.name}</span>
        <span className="ml-2.5 align-baseline font-mono text-[0.78em] font-normal tabular text-foreground-soft">
          {session.version}
        </span>
      </h2>
      <dl className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] tabular text-muted-foreground">
        <DT>{session.files.length} files</DT>
        <Sep />
        <DT>{format_bytes(total_bytes)}</DT>
        <Sep />
        <DT>{session.chain.chain_id}</DT>
      </dl>
      {session.tags && session.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {session.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2 py-0.5 font-mono text-[10.5px] tabular text-foreground-soft"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DT({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular">{children}</span>;
}

function Sep() {
  return (
    <span aria-hidden className="text-muted-foreground/40">
      ·
    </span>
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

function Cost({ session }: { session: PublishSessionInput }) {
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
        if (!cancelled) set_solana({ kind: 'success', data });
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
        if (!cancelled) set_irys({ kind: 'success', data });
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

  const both_ready = solana.kind === 'success' && irys.kind === 'success';
  const total_lamports = both_ready
    ? BigInt(solana.data.total_lamports) + BigInt(irys.data.price_atomic)
    : undefined;
  const has_error = solana.kind === 'error' || irys.kind === 'error';

  return (
    <section aria-label="Estimated cost" className="grid gap-5">
      <div className="grid gap-1.5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          Estimated cost
        </p>
        <div className="flex flex-wrap items-baseline gap-3">
          <span
            className={cn(
              'font-mono text-[2.25rem] font-medium leading-none tabular tracking-[-0.02em] sm:text-[2.75rem]',
              total_lamports !== undefined
                ? 'text-foreground'
                : 'text-muted-foreground/50',
            )}
          >
            {total_lamports !== undefined
              ? `~${format_lamports_as_sol(total_lamports)}`
              : has_error
                ? '—'
                : '···'}
          </span>
          <span className="font-mono text-[14px] tabular text-foreground-soft">
            SOL
          </span>
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          Charged to your connected wallet. Covers permanent Irys storage,
          Solana rent, and a 5,000-lamport base fee
          {solana.kind === 'success' && solana.data.creates_name
            ? ' · first release for this name'
            : ''}
          .
        </p>
      </div>

      <details className="border-t border-border">
        <summary className="group flex cursor-pointer list-none items-center gap-2 py-3 text-[11.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground-soft [&::-webkit-details-marker]:hidden">
          <ChevronDown
            className="size-3.5 transition-transform duration-200 group-open:rotate-180"
            strokeWidth={2}
            aria-hidden
          />
          <span>Breakdown</span>
        </summary>

        <dl className="grid divide-y divide-border">
          <CostLine
            label="Irys upload"
            state={irys}
            primary={(d) => `${format_lamports_as_sol(BigInt(d.price_atomic))} SOL`}
            secondary={(d) =>
              `${format_bytes(d.bytes)} · ${format_bytes(d.files_bytes)} files + ${format_bytes(d.manifest_bytes)} manifest`
            }
          />
          <CostLine
            label="Solana transaction"
            state={solana}
            primary={(d) => `${format_lamports_as_sol(d.total_lamports)} SOL`}
            secondary={(d) =>
              `rent ${format_lamports_as_sol(d.release_rent_lamports + d.name_rent_lamports)} + fee ${format_lamports_as_sol(d.base_fee_lamports)}`
            }
          />
        </dl>
      </details>
    </section>
  );
}

function CostLine<T>({
  label,
  state,
  primary,
  secondary,
}: {
  label: string;
  state:
    | { kind: 'pending' }
    | { kind: 'success'; data: T }
    | { kind: 'error'; message: string };
  primary: (data: T) => string;
  secondary: (data: T) => string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-3">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right">
        {state.kind === 'pending' ? (
          <span className="font-mono text-[13px] tabular text-muted-foreground/60">
            estimating…
          </span>
        ) : state.kind === 'error' ? (
          <span
            className="font-mono text-[12.5px] tabular text-destructive"
            title={state.message}
          >
            unavailable
          </span>
        ) : (
          <span className="font-mono text-[13px] tabular text-foreground">
            {primary(state.data)}
          </span>
        )}
      </dd>
      {state.kind === 'success' ? (
        <p className="col-span-2 font-mono text-[11.5px] tabular text-muted-foreground">
          {secondary(state.data)}
        </p>
      ) : null}
    </div>
  );
}

function Action({
  session,
  wallet_pubkey,
  wallet_connected,
  run,
  on_publish,
  on_cancel,
}: {
  session: PublishSessionInput;
  wallet_pubkey: string | null;
  wallet_connected: boolean;
  run: RunState;
  on_publish: () => void;
  on_cancel: () => void;
}) {
  if (run.kind === 'success') {
    return (
      <Success
        result={run.result}
        name={session.name}
        version={session.version}
      />
    );
  }

  const running = run.kind === 'running';
  const failed = run.kind === 'failed';
  const events = run.kind === 'idle' ? [] : run.events;

  return (
    <section
      aria-label="Publish action"
      className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:p-7"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="grid min-w-0 gap-1">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
            Wallet
          </p>
          <p
            className={cn(
              'truncate font-mono text-[13px] tabular',
              wallet_pubkey ? 'text-foreground' : 'text-muted-foreground',
            )}
            title={wallet_pubkey ?? undefined}
          >
            {wallet_pubkey ?? 'Connect a wallet to continue'}
          </p>
        </div>
        <WalletMultiButton style={wallet_button_style} />
      </div>

      {events.length > 0 ? (
        <CurrentStep events={events} active={running} />
      ) : null}

      {failed ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
          {run.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
        {running ? (
          <Button variant="ghost" onClick={on_cancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          size="lg"
          onClick={on_publish}
          disabled={!wallet_connected || running}
        >
          {running ? (
            <>
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
              Publishing
            </>
          ) : (
            <>Publish release</>
          )}
        </Button>
      </div>
    </section>
  );
}

function CurrentStep({
  events,
  active,
}: {
  events: PublishFlowEvent[];
  active: boolean;
}) {
  const last = events[events.length - 1];
  if (!last) return null;

  return (
    <details className="grid gap-2">
      <summary className="group flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className="relative inline-flex size-2 items-center justify-center">
          <span
            aria-hidden
            className={cn(
              'absolute inline-flex size-2 rounded-full opacity-60',
              active ? 'animate-ping bg-accent/60' : '',
            )}
          />
          <span
            aria-hidden
            className={cn(
              'relative inline-flex size-1.5 rounded-full',
              active ? 'bg-accent' : 'bg-muted-foreground/60',
            )}
          />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] tabular text-foreground-soft">
          {progress_message(last)}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground-soft">
          {events.length} step{events.length === 1 ? '' : 's'}
          <ChevronDown
            className="size-3 transition-transform duration-200 group-open:rotate-180"
            strokeWidth={2}
            aria-hidden
          />
        </span>
      </summary>

      <ol className="grid gap-1 rounded-lg border border-border bg-background px-3 py-2.5">
        {events.map((event, idx) => (
          <li
            key={`${event.kind}-${idx}`}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3 font-mono text-[11.5px] tabular"
          >
            <span className="text-muted-foreground/70">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span className="text-foreground-soft">
              {progress_message(event)}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

const REDIRECT_AFTER_SECONDS = 5;

function Success({
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
      void navigate(target);
      return;
    }

    const handle = setTimeout(() => set_seconds_left((s) => s - 1), 1000);
    return () => clearTimeout(handle);
  }, [seconds_left, navigate, target]);

  return (
    <section
      aria-label="Published"
      className="grid gap-5 rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-7"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Check className="size-4" strokeWidth={2.4} aria-hidden />
        </span>
        <div className="grid gap-0.5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-accent">
            Published
          </p>
          <p className="text-[15px] font-medium tracking-[-0.005em] text-foreground">
            {name}{' '}
            <span className="font-mono tabular text-foreground-soft">
              {version}
            </span>{' '}
            is live.
          </p>
        </div>
      </div>

      <dl className="grid gap-2 border-t border-accent/20 pt-4 text-[12px] sm:grid-cols-2">
        <Receipt label="Release" value={result.release_address} />
        <Receipt label="Signature" value={result.signature} />
        <Receipt label="Manifest hash" value={result.manifest_hash} />
        <Receipt label="Manifest URI" value={result.manifest_uri} />
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-accent/20 pt-4 text-[12.5px]">
        <p className="text-foreground-soft">
          Taking you to your release in{' '}
          <span className="font-mono tabular text-foreground">
            {seconds_left}s
          </span>
          .
        </p>
        <Link
          to={target}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/92 active:translate-y-px"
        >
          Open now
          <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function Receipt({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className="truncate font-mono text-[12px] tabular text-foreground"
        title={value}
      >
        {shorten(value, 10, 8)}
      </dd>
    </div>
  );
}

function Advanced({ session }: { session: PublishSessionInput }) {
  return (
    <details className="border-t border-border">
      <summary className="group flex cursor-pointer list-none items-center gap-2 py-4 text-[11.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground-soft [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="size-3.5 transition-transform duration-200 group-open:rotate-180"
          strokeWidth={2}
          aria-hidden
        />
        <span>Advanced details</span>
      </summary>

      <dl className="grid gap-3 pb-2 sm:grid-cols-2">
        <Detail label="Entry" value={session.entry} />
        <Detail label="Chain" value={session.chain.chain_id} />
        <Detail label="Program ID" value={session.chain.program_id} />
        <Detail label="RPC" value={session.rpc_url} />
        <Detail label="Irys network" value={session.irys_network} />
        {session.prev_version ? (
          <Detail label="Previous version" value={session.prev_version} />
        ) : null}
        {session.license ? (
          <Detail label="License" value={session.license} />
        ) : null}
        {session.language ? (
          <Detail label="Language" value={session.language} />
        ) : null}
      </dl>
    </details>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className="truncate font-mono text-[12.5px] tabular text-foreground"
        title={value}
      >
        {value}
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
      return 'Preparing the upload client…';
    case 'wallet_connected':
      return `Wallet connected (${truncate(event.address, 12)})`;
    case 'fund_required':
      return `Topping up Irys: ${event.amount_atomic} atomic units for ${event.bytes} bytes`;
    case 'funding':
      return 'Waiting for you to approve the Irys funding transaction…';
    case 'funded':
      return 'Irys balance topped up.';
    case 'manifest_signing':
      return 'Waiting for you to sign the manifest…';
    case 'uploading_bundle':
      return `Waiting for you to sign the Irys bundle (${event.total} item${event.total === 1 ? '' : 's'})…`;
    case 'manifest_uploaded':
      return `Manifest uploaded: ${truncate(event.manifest_uri, 24)}`;
    case 'tx_sending':
      return 'Waiting for you to approve the Solana transaction…';
    case 'tx_confirmed':
      return `Release confirmed on Solana (${truncate(event.signature, 16)})`;
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
  if (value.length <= head + 4) return value;
  return `${value.slice(0, head)}…${value.slice(-4)}`;
}
