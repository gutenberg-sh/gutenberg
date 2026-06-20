import { useApiHealth } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function ApiStatus() {
  const health = useApiHealth();

  const status = derive_status(health);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums text-muted-foreground"
      title={status.title}
    >
      <span className="relative inline-flex size-2 items-center justify-center">
        <span
          aria-hidden
          className={cn(
            'absolute inline-flex size-2 rounded-full opacity-60',
            status.tone === 'ok' &&
              'animate-ping bg-[var(--telemetry-green)]/70',
          )}
        />
        <span
          aria-hidden
          className={cn(
            'relative inline-flex size-1.5 rounded-full',
            status.tone === 'ok' && 'bg-[var(--telemetry-green)]',
            status.tone === 'down' && 'bg-destructive',
            status.tone === 'unknown' && 'bg-muted-foreground/60',
          )}
        />
      </span>
      <span>{status.label}</span>
    </span>
  );
}

function derive_status(health: ReturnType<typeof useApiHealth>): {
  tone: 'ok' | 'down' | 'unknown';
  label: string;
  title: string;
} {
  if (health.isLoading) {
    return {
      tone: 'unknown',
      label: 'API · checking',
      title: 'Checking the API…',
    };
  }

  if (health.isError || !health.data) {
    return {
      tone: 'down',
      label: 'API · offline',
      title:
        "We can't reach the API. Browse and search won't work until it's back.",
    };
  }

  if (health.data.status === 'ok') {
    return {
      tone: 'ok',
      label: 'API · live',
      title: 'API is up and the database connection is healthy.',
    };
  }

  return {
    tone: 'unknown',
    label: 'API · degraded',
    title: 'API replied but did not report a healthy status.',
  };
}
