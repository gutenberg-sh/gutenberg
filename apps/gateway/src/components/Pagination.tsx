import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const page_btn_focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function Pagination({
  page,
  has_prev,
  has_next,
  loading,
  on_prev,
  on_next,
  with_top_border = true,
  className,
}: {
  page: number;
  has_prev: boolean;
  has_next: boolean;
  loading?: boolean;
  on_prev: () => void;
  on_next: () => void;
  /** When false, omit top rule (parent already separated the list). */
  with_top_border?: boolean;
  className?: string;
}) {
  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex items-center justify-between gap-3 text-[12px]',
        with_top_border ? 'border-t border-border pt-5' : 'pt-0',
        className,
      )}
    >
      <p className="font-mono tabular text-muted-foreground">
        Page <span className="text-foreground">{page}</span>
        {loading ? (
          <span className="ml-2 text-muted-foreground/70">· loading…</span>
        ) : null}
      </p>

      <div className="flex items-center gap-1">
        <PageButton disabled={!has_prev || loading} on_click={on_prev}>
          <ChevronLeft className="size-3.5" strokeWidth={1.85} aria-hidden />
          Previous
        </PageButton>
        <PageButton disabled={!has_next || loading} on_click={on_next}>
          Next
          <ChevronRight className="size-3.5" strokeWidth={1.85} aria-hidden />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  children,
  disabled,
  on_click,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  on_click: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={on_click}
      disabled={disabled}
      className={cn(
        'gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-foreground-soft transition-[color,border-color,background-color,transform] duration-200 ease-out',
        page_btn_focus,
        disabled
          ? 'opacity-40'
          : 'hover:border-border-strong hover:bg-surface/50 hover:text-foreground active:translate-y-px',
      )}
    >
      {children}
    </Button>
  );
}
