import {
  type PublishSessionInput,
  type PublishSessionResult,
} from '@gutenberg/core';
import { useWallet, useWalletSession } from '@solana/react-hooks';
import { ArrowUpRight, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PublisherAddressLink } from '@/components/PublisherAddressLink';
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
import { type PublishFlowEvent, run_publish_flow } from '@/lib/publish-flow';
import { cn } from '@/lib/utils';

type RunState =
  | { kind: 'idle' }
  | { kind: 'running'; events: PublishFlowEvent[] }
  | {
      kind: 'success';
      events: PublishFlowEvent[];
      result: PublishSessionResult;
    }
  | { kind: 'failed'; events: PublishFlowEvent[]; message: string };

export function PublishFlowPanel({
  session,
}: {
  session: PublishSessionInput;
}) {
  const wallet = useWallet();
  const wallet_session = useWalletSession();
  const [run, set_run] = useState<RunState>({ kind: 'idle' });
  const publish_lock_ref = useRef(false);
  const cost_state = usePublishCostEstimates(session);

  async function on_publish() {
    if (publish_lock_ref.current) return;

    publish_lock_ref.current = true;
    const events: PublishFlowEvent[] = [];
    set_run({ kind: 'running', events });

    try {
      if (!wallet_session) {
        throw new Error('Connect a wallet to publish.');
      }

      const result = await run_publish_flow({
        session,
        wallet_session,
        irys_bundler_url: env.VITE_GUTENBERG_IRYS_GATEWAY,
        on_event: (event) => {
          events.push(event);
          set_run({ kind: 'running', events: [...events] });
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

      set_run({
        kind: 'success',
        events,
        result: { protocol_version: 1, ...final_result },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set_run({ kind: 'failed', events, message });
    } finally {
      publish_lock_ref.current = false;
    }
  }

  function on_cancel() {
    set_run({
      kind: 'failed',
      events: run.kind === 'idle' ? [] : run.events,
      message: 'Cancelled',
    });
  }

  return (
    <div className="grid w-full max-w-[880px] gap-4">
      <Identity session={session} />

      <Action
        session={session}
        cost={cost_state}
        wallet_pubkey={
          wallet.status === 'connected' && wallet_session
            ? wallet_session.account.address.toString()
            : null
        }
        wallet_connected={Boolean(
          wallet.status === 'connected' &&
          wallet_session?.signMessage &&
          wallet_session?.signTransaction,
        )}
        run={run}
        on_publish={() => void on_publish()}
        on_cancel={on_cancel}
      />
    </div>
  );
}

function Identity({ session }: { session: PublishSessionInput }) {
  const total_bytes = session.files.reduce((acc, f) => acc + f.size_bytes, 0);

  return (
    <section
      aria-label="What you are publishing"
      className="grid gap-2 border border-dashed border-border/80 bg-surface/35 px-3 py-2.5 sm:px-3.5 sm:py-3"
    >
      <p className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-muted-foreground/90">
        About to publish
      </p>
      <p className="min-w-0 break-words font-mono text-[13.5px] leading-snug text-foreground/90 tabular sm:text-[14px]">
        {session.registry_id}
        <span className="text-muted-foreground/90">@</span>
        {session.version}
      </p>
      <dl className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] leading-snug text-muted-foreground sm:text-[11.5px]">
        <DT>{session.files.length} files</DT>
        <Sep />
        <DT>{format_bytes(total_bytes)}</DT>
        <Sep />
        <DT>{session.chain.chain_id}</DT>
      </dl>
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
      registry_id: session.registry_id,
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

function CostBreakdown({ precomputed }: { precomputed: PublishCostEstimates }) {
  const { solana, irys, total_s } = precomputed;

  return (
    <div className="grid gap-3">
      <p className="text-[12.5px] leading-[1.55] text-muted-foreground">
        Charged to your connected wallet. Covers Irys, Solana rent, and
        5,000-lamport base
        {solana.kind === 'success' && solana.data.creates_publication
          ? ' · first on-chain publication record for this registry id'
          : ''}
        .
      </p>
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
          Total (estimate)
        </p>
        <p className="mt-0.5 font-mono text-[1.35rem] font-medium tabular leading-none sm:text-[1.5rem] text-foreground">
          {total_s}{' '}
          <span className="text-[0.6em] text-foreground-soft">SOL</span>
        </p>
      </div>
      <div className="grid divide-y divide-border">
        <CostLine
          label="Irys upload"
          state={irys}
          primary={(d) =>
            `${format_lamports_as_sol(BigInt(d.price_atomic))} SOL`
          }
          secondary={(d) =>
            `${format_bytes(d.bytes)} · ${format_bytes(d.files_bytes)} files + ${format_bytes(d.manifest_bytes)} manifest`
          }
        />
        <CostLine
          label="Solana transaction"
          state={solana}
          primary={(d) => `${format_lamports_as_sol(d.total_lamports)} SOL`}
          secondary={(d) =>
            `rent ${format_lamports_as_sol(d.release_rent_lamports + d.publication_rent_lamports)} + fee ${format_lamports_as_sol(d.base_fee_lamports)}`
          }
        />
      </div>
    </div>
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-2.5">
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
  const running = run.kind === 'running';

  if (run.kind === 'success') {
    return (
      <Success
        result={run.result}
        registry_id={session.registry_id}
        version={session.version}
      />
    );
  }
  const failed = run.kind === 'failed';
  const events = run.kind === 'idle' ? [] : run.events;

  return (
    <section
      aria-label="Publish action"
      className="grid gap-4 rounded-none border border-border bg-card p-4 sm:p-5"
    >
      <div className="border-b border-border/80 pb-4">
        <p className="mb-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Cost summary
        </p>
        <CostBreakdown precomputed={cost} />
      </div>
      <div className="grid min-w-0 gap-0.5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          Wallet
        </p>
        <p
          className={cn(
            'font-mono text-[13px] leading-snug tabular',
            wallet_pubkey ? 'text-foreground' : 'text-muted-foreground',
          )}
          title={wallet_pubkey ?? undefined}
        >
          {wallet_pubkey ?? 'Connect a wallet in the header to publish.'}
        </p>
      </div>

      {events.length > 0 ? (
        <CurrentStep events={events} active={running} />
      ) : null}

      {failed ? (
        <p className="rounded-none border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
          {run.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3.5">
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
    <details className="grid gap-1.5">
      <summary className="group flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
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
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] tabular text-foreground-soft">
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

      <ol className="grid gap-0.5 rounded-none border border-border bg-background px-2.5 py-2">
        {events.map((event, idx) => (
          <li
            key={`${event.kind}-${idx}`}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2 font-mono text-[11px] tabular"
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
  registry_id,
  version,
}: {
  result: PublishSessionResult;
  registry_id: string;
  version: string;
}) {
  const navigate = useNavigate();
  const target = `/publication/${encodeURIComponent(registry_id)}/${encodeURIComponent(version)}`;
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
      className="grid gap-3.5 rounded-none border border-accent/30 bg-accent/5 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-7 items-center justify-center rounded-none bg-accent text-accent-foreground">
          <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
        </span>
        <div className="grid gap-0.5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-accent">
            Published
          </p>
          <p className="text-[14px] font-medium tracking-[-0.005em] text-foreground">
            {registry_id}{' '}
            <span className="font-mono tabular text-foreground-soft">
              {version}
            </span>{' '}
            is live.
          </p>
        </div>
      </div>

      <dl className="grid gap-1.5 border-t border-accent/20 pt-3 text-[11.5px] sm:grid-cols-2">
        <div className="grid gap-0.5">
          <dt className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Publisher
          </dt>
          <dd className="min-w-0 font-mono text-[12px] tabular text-foreground">
            <PublisherAddressLink
              address={result.publisher}
              avatarSize={22}
              className="max-w-full hover:underline"
            >
              <span className="min-w-0 truncate">
                {shorten(result.publisher, 10, 8)}
              </span>
            </PublisherAddressLink>
          </dd>
        </div>
        <Receipt label="Release" value={result.release_address} />
        <Receipt label="Signature" value={result.signature} />
        <Receipt label="Manifest hash" value={result.manifest_hash} />
        <Receipt label="Manifest URI" value={result.manifest_uri} />
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-accent/20 pt-3 text-[12px]">
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

function truncate(value: string, head: number): string {
  if (value.length <= head + 4) return value;
  return `${value.slice(0, head)}…${value.slice(-4)}`;
}
