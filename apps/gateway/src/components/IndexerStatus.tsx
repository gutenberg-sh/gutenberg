import { useIndexerHealth } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function IndexerStatus() {
  const health = useIndexerHealth();

  const status = derive_status(health);

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular text-muted-foreground"
      title={status.title}
    >
      <span className="relative inline-flex size-2 items-center justify-center">
        <span
          aria-hidden
          className={cn(
            'absolute inline-flex size-2 rounded-none opacity-60',
            status.tone === 'ok' &&
              'animate-ping bg-[var(--telemetry-green)]/70',
          )}
        />
        <span
          aria-hidden
          className={cn(
            'relative inline-flex size-1.5 rounded-none',
            status.tone === 'ok' && 'bg-[var(--telemetry-green)]',
            status.tone === 'lag' && 'bg-amber-500',
            status.tone === 'down' && 'bg-destructive',
            status.tone === 'unknown' && 'bg-muted-foreground/60',
          )}
        />
      </span>
      <span>{status.label}</span>
    </span>
  );
}

function derive_status(health: ReturnType<typeof useIndexerHealth>): {
  tone: 'ok' | 'lag' | 'down' | 'unknown';
  label: string;
  title: string;
} {
  if (health.isLoading) {
    return {
      tone: 'unknown',
      label: 'Indexer · checking',
      title: 'Checking the indexer…',
    };
  }

  if (health.isError || !health.data) {
    return {
      tone: 'down',
      label: 'Indexer · offline',
      title:
        "We can't reach the indexer. Recent publications won't refresh until it's back.",
    };
  }

  const lag = health.data.lag_slots;
  const backfill_done = health.data.backfill_completed_at != null;

  if (lag === null) {
    return {
      tone: 'unknown',
      label: 'Indexer · syncing',
      title:
        'Indexer replied but Solana RPC data was incomplete — often a transient RPC error from the indexer. Retry shortly or check GUTENBERG_INDEXER_SOLANA_RPC_URL.',
    };
  }

  if (lag <= 50) {
    return {
      tone: 'ok',
      label: 'Indexer · live',
      title: `Caught up with latest registry activity on this RPC — ${lag} slot${lag === 1 ? '' : 's'} behind the newest program transaction.`,
    };
  }

  if (lag <= 5_000) {
    return {
      tone: 'lag',
      label: `Indexer · ~${lag} slots behind`,
      title:
        'Behind the newest registry transaction — ingest or reconcile is still catching up.',
    };
  }

  if (!backfill_done) {
    return {
      tone: 'lag',
      label: 'Indexer · backfilling',
      title:
        'Initial historical sync is still running (large gap vs the newest registry tx on this RPC).',
    };
  }

  return {
    tone: 'lag',
    label: `Indexer · ~${lag} slots behind`,
    title:
      'Far behind the newest registry transaction — check WebSocket ingest, reconcile logs, or RPC/program ID mismatch.',
  };
}
