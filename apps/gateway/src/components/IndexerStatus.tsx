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
            'absolute inline-flex size-2 rounded-full opacity-60',
            status.tone === 'ok' && 'animate-ping bg-accent/60',
          )}
        />
        <span
          aria-hidden
          className={cn(
            'relative inline-flex size-1.5 rounded-full',
            status.tone === 'ok' && 'bg-accent',
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
    return { tone: 'unknown', label: 'Indexer · checking', title: 'Pinging the indexer' };
  }

  if (health.isError || !health.data) {
    return {
      tone: 'down',
      label: 'Indexer · offline',
      title: 'Indexer is unreachable; live feeds will not refresh',
    };
  }

  const lag = health.data.lag_slots;
  if (lag === null) {
    return {
      tone: 'unknown',
      label: 'Indexer · syncing',
      title: 'Indexer connected but slot lag is unknown',
    };
  }

  if (lag <= 50) {
    return {
      tone: 'ok',
      label: 'Indexer · live',
      title: `${lag} slot${lag === 1 ? '' : 's'} behind chain head`,
    };
  }

  if (lag <= 5_000) {
    return {
      tone: 'lag',
      label: `Indexer · ~${lag} slots behind`,
      title: 'Indexer is catching up to chain head',
    };
  }

  return {
    tone: 'lag',
    label: 'Indexer · backfilling',
    title: 'Indexer is performing initial backfill',
  };
}
