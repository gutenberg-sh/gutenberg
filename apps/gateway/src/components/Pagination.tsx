import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Pagination({
  page,
  has_prev,
  has_next,
  loading,
  on_prev,
  on_next,
}: {
  page: number;
  has_prev: boolean;
  has_next: boolean;
  loading?: boolean;
  on_prev: () => void;
  on_next: () => void;
}) {
  if (!has_prev && !has_next && !loading) {
    return null;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-border pt-5 text-[12px]"
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
    <button
      type="button"
      onClick={on_click}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-foreground-soft transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:border-border-strong hover:text-foreground active:translate-y-px',
      )}
    >
      {children}
    </button>
  );
}
