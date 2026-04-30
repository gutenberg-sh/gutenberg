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
        'inline-flex items-baseline gap-2 font-semibold tracking-tight',
        className,
      )}
    >
      <Glyph aria-hidden />
      <span>Gutenberg</span>
      {showSubmark ? (
        <span className="text-xs font-normal uppercase tracking-[0.18em] text-muted-foreground/80">
          gateway
        </span>
      ) : null}
    </span>
  );
}

export function Glyph({
  className,
  ...rest
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      className={cn('size-[1.1em] translate-y-[2px]', className)}
      role="img"
      {...rest}
    >
      <title>Gutenberg</title>
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="5"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
      <path
        d="M16.6 8.6c-.7-1.6-2.3-2.7-4.3-2.7-3 0-4.9 2.3-4.9 5.6s1.9 5.6 4.9 5.6c1.7 0 3-.7 3.8-1.6v-2.7h-3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
