import { cn } from '@/lib/utils';

export function Wordmark({
  className,
  showSubmark = true,
}: {
  className?: string;
  showSubmark?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap font-sans text-[0.95em] font-extrabold tracking-[-0.05em] uppercase',
        className,
      )}
    >
      <span className="leading-none">Gutenberg</span>
      {showSubmark ? (
        <sup className="ml-1.5 font-mono text-[0.54em] font-semibold leading-none tracking-[0.18em] text-muted-foreground uppercase sm:ml-2">
          Gateway
        </sup>
      ) : null}
    </span>
  );
}
