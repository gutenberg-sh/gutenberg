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
        'inline-block whitespace-nowrap font-sans text-[0.95em] font-extrabold tracking-[-0.04em] uppercase',
        className,
      )}
    >
      <span className="text-foreground leading-none dark:text-primary">
        Gutenberg
      </span>
      {showSubmark ? (
        <sup className="ml-1.5 align-top text-[0.52em] font-medium leading-none tracking-wide text-muted-foreground sm:ml-2">
          Gateway
        </sup>
      ) : null}
    </span>
  );
}
