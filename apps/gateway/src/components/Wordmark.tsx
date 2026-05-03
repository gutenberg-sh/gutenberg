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
        'inline-flex items-center gap-2 font-sans text-[0.95em] font-extrabold tracking-[-0.05em] uppercase',
        className,
      )}
    >
      <span className="leading-none">Gutenberg</span>
      {showSubmark ? (
        <span className="ml-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          gateway
        </span>
      ) : null}
    </span>
  );
}
