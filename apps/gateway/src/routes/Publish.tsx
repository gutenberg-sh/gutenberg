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
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
          <div className="h-9 w-72 max-w-full animate-pulse rounded-none bg-muted" />
          <div className="h-3.5 w-2/3 max-w-md animate-pulse rounded-none bg-muted/70" />
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

  return (
    <PublishSessionContent
      load={load}
      wallet={wallet}
      run={run}
      set_run={set_run}
      on_publish_core={fired_run_ref}
    />
  );
}

type PublishContentProps = {
  load: Extract<LoadState, { kind: 'ready' }>;
} & {
  wallet: ReturnType<typeof useWallet>;
  run: RunState;
  set_run: React.Dispatch<React.SetStateAction<RunState>>;
  on_publish_core: React.MutableRefObject<boolean>;
};

function PublishSessionContent({
  load,
  wallet,
  run,
  set_run,
  on_publish_core: fired_run_ref,
}: PublishContentProps) {
  const { session, cfg: session_cfg } = load;
  const cost_state = usePublishCostEstimates(session);

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
    <Container className="grid gap-6 pb-20 pt-8 sm:pt-10 lg:gap-8 lg:pb-24 lg:pt-12">
      <header className="grid max-w-[52ch] gap-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground">
          Publish
        </p>
        <h1 className="text-[1.5rem] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[1.9rem]">
          Publish a version that never unpublishes.
        </h1>
        <p className="text-[13.5px] leading-[1.5] text-foreground-soft">
          Connect your wallet, then use <strong className="font-medium text-foreground/90">Publish publication</strong> to open
          a confirmation with the full cost breakdown before you sign.
        </p>
      </header>

      <Identity session={session} />

      <Action
        session={session}
        cost={cost_state}
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
      aria-label="What you are publishing"
      className="grid gap-2.5 border border-dashed border-border/80 bg-surface/35 px-3.5 py-3 sm:gap-2 sm:px-4 sm:py-3.5"
    >
      <p className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-muted-foreground/90">
        About to publish
      </p>
      <p className="min-w-0 break-words font-mono text-[14px] leading-snug text-foreground/90 tabular sm:text-[15px]">
        {session.name}
        <span className="text-muted-foreground/90">@</span>
        {session.version}
      </p>
      <dl className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] leading-relaxed text-muted-foreground sm:text-[12px]">
        <DT>{session.files.length} files</DT>
        <Sep />
        <DT>{format_bytes(total_bytes)}</DT>
        <Sep />
        <DT>{session.chain.chain_id}</DT>
      </dl>
      {session.tags && session.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
          {session.tags.map((tag) => (
            <span
              key={tag}
              className="border border-border/60 bg-background/20 px-1.5 py-0.5 font-mono text-[10px] tabular text-foreground/75"
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

type PublishCostEstimates = {
  solana: SolanaCostState;
  irys: IrysCostState;
  both_ready: boolean;
  total_lamports: bigint | undefined;
  has_error: boolean;
  total_s: string;
};

function usePublishCostEstimates(
  session: PublishSessionInput,
): PublishCostEstimates {
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
  const total_s =
    total_lamports !== undefined
      ? `~${format_lamports_as_sol(total_lamports)}`
      : has_error
        ? '—'
        : '···';

  return { solana, irys, both_ready, total_lamports, has_error, total_s };
}

/** Full cost copy + Irys / Solana lines (used in the confirm dialog). */
function CostBreakdown({ precomputed }: { precomputed: PublishCostEstimates }) {
  const { solana, irys, total_s } = precomputed;

  return (
    <div className="grid gap-3">
      <p className="text-[12.5px] leading-[1.55] text-muted-foreground">
        Charged to your connected wallet. Covers Irys, Solana rent, and
        5,000-lamport base
        {solana.kind === 'success' && solana.data.creates_name
          ? ' · first publication for this name'
          : ''}
        .
      </p>
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
          Total (estimate)
        </p>
        <p className="mt-0.5 font-mono text-[1.4rem] font-medium tabular leading-none sm:text-[1.55rem] text-foreground">
          {total_s} <span className="text-[0.6em] text-foreground-soft">SOL</span>
        </p>
      </div>
      <div className="grid divide-y divide-border">
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
      </div>
    </div>
  );
}

function PublishConfirmDialog({
  open,
  on_open_change,
  session,
  precomputed,
  on_confirm,
}: {
  open: boolean;
  on_open_change: (open: boolean) => void;
  session: PublishSessionInput;
  precomputed: PublishCostEstimates;
  on_confirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function on_key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        on_open_change(false);
      }
    }
    window.addEventListener('keydown', on_key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', on_key);
    };
  }, [open, on_open_change]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/92 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-confirm-title"
      onClick={() => on_open_change(false)}
    >
      <div
        className="max-h-[min(90dvh,640px)] w-full max-w-lg overflow-y-auto overscroll-contain border-2 border-border bg-card p-5 shadow-sm sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <p
              className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-muted-foreground"
              id="publish-confirm-eyebrow"
            >
              Review &amp; pay
            </p>
            <h2
              className="mt-1.5 text-[1.1rem] font-semibold text-foreground sm:text-[1.2rem]"
              id="publish-confirm-title"
            >
              Confirm publish
            </h2>
            <p className="mt-0.5 truncate font-mono text-[12.5px] text-foreground-soft" title={`${session.name}@${session.version}`}>
              {session.name}
              <span className="text-muted-foreground">@</span>
              {session.version}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="inline-flex size-8 shrink-0 items-center justify-center border-2 border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            onClick={() => on_open_change(false)}
          >
            <X className="size-3.5" strokeWidth={1.9} />
          </button>
        </div>
        <div className="mt-4">
          <CostBreakdown precomputed={precomputed} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => on_open_change(false)} className="w-full sm:w-auto">
            Back
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => {
              on_confirm();
              on_open_change(false);
            }}
            className="w-full sm:w-auto"
          >
            Confirm and publish
          </Button>
        </div>
      </div>
    </div>,
    document.body,
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
  cost,
  wallet_pubkey,
  wallet_connected,
  run,
  on_publish,
  on_cancel,
}: {
  session: PublishSessionInput;
  cost: PublishCostEstimates;
  wallet_pubkey: string | null;
  wallet_connected: boolean;
  run: RunState;
  on_publish: () => void;
  on_cancel: () => void;
}) {
  const [confirm_open, set_confirm_open] = useState(false);
  const running = run.kind === 'running';

  useEffect(() => {
    if (running) set_confirm_open(false);
  }, [running]);

  if (run.kind === 'success') {
    return (
      <Success
        result={run.result}
        name={session.name}
        version={session.version}
      />
    );
  }
  const failed = run.kind === 'failed';
  const events = run.kind === 'idle' ? [] : run.events;

  return (
    <section
      aria-label="Publish action"
      className="grid gap-5 rounded-none border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/80 pb-4">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Est. cost
        </span>
        <span
          className={cn(
            'font-mono text-[1.15rem] font-medium tabular sm:text-[1.2rem]',
            cost.total_lamports !== undefined
              ? 'text-foreground'
              : 'text-muted-foreground/45',
          )}
        >
          {cost.total_s}{' '}
          <span className="text-[0.7em] text-foreground-soft">SOL</span>
        </span>
      </div>
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
        <p className="rounded-none border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
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
          onClick={() => set_confirm_open(true)}
          disabled={!wallet_connected || running}
        >
          {running ? (
            <>
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
              Publishing
            </>
          ) : (
            <>Publish publication</>
          )}
        </Button>
      </div>

      <PublishConfirmDialog
        open={confirm_open}
        on_open_change={set_confirm_open}
        session={session}
        precomputed={cost}
        on_confirm={on_publish}
      />
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
              'absolute inline-flex size-2 rounded-none opacity-60',
              active ? 'animate-ping bg-accent/60' : '',
            )}
          />
          <span
            aria-hidden
            className={cn(
              'relative inline-flex size-1.5 rounded-none',
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

      <ol className="grid gap-1 rounded-none border border-border bg-background px-3 py-2.5">
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
  const target = `/publication/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
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
      className="grid gap-5 rounded-none border border-accent/30 bg-accent/5 p-6 sm:p-7"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-8 items-center justify-center rounded-none bg-accent text-accent-foreground">
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
        <div className="grid gap-0.5">
          <dt className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Publisher
          </dt>
          <dd className="truncate font-mono text-[12px] tabular text-foreground">
            <Link
              to={`/p/${encodeURIComponent(result.publisher)}`}
              className="hover:underline"
              title={result.publisher}
            >
              {shorten(result.publisher, 10, 8)}
            </Link>
          </dd>
        </div>
        <Receipt label="Publication" value={result.release_address} />
        <Receipt label="Signature" value={result.signature} />
        <Receipt label="Manifest hash" value={result.manifest_hash} />
        <Receipt label="Manifest URI" value={result.manifest_uri} />
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-accent/20 pt-4 text-[12.5px]">
        <p className="text-foreground-soft">
          Taking you to your publication in{' '}
          <span className="font-mono tabular text-foreground">
            {seconds_left}s
          </span>
          .
        </p>
        <Link
          to={target}
          className="inline-flex items-center gap-1.5 rounded-none bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px"
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
      return `Publication confirmed on Solana (${truncate(event.signature, 16)})`;
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
