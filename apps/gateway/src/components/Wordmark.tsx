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
        'inline-flex items-center gap-2 font-semibold tracking-[-0.02em]',
        className,
      )}
    >
      <Glyph aria-hidden />
      <span>Gutenberg</span>
      {showSubmark ? (
        <span className="ml-1 text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
          gateway
        </span>
      ) : null}
    </span>
  );
}

export function Glyph({ className, ...rest }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      role="img"
      aria-hidden
      className={cn('size-[1.15em]', className)}
      {...rest}
    >
      {/* Vertical bar — a printer's measure. */}
      <path
        d="M5 4 L5 20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Geometric G. */}
      <path
        d="M19.2 8.5C18.45 6.65 16.5 5.4 14 5.4 10.4 5.4 8 8.4 8 12s2.4 6.6 6 6.6c2.05 0 3.6-.85 4.55-1.9V12.7H14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Accent registration mark. */}
      <circle cx="20.5" cy="6" r="1.4" fill="var(--accent)" />
    </svg>
  );
}
