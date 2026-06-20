import {
  useMemo,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { PublisherAddressLink } from '@/components/PublisherAddressLink';
import {
  ReleaseListHeader,
  ReleaseListSkeleton,
} from '@/components/ReleaseRow';
import { format_relative_time, shorten, format_empty } from '@/lib/format';
import type { PublicationDto } from '@/lib/queries';
import { registry_feed_shell, registry_feed_x } from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

type PublicationFeedSectionProps = {
  loading: boolean;
  skeleton_rows?: number;
  /** When false, skips “Publication / Published” row (rare). */
  show_column_headers?: boolean;
  /** Optional block above column headers (e.g. explore search field). */
  header?: ReactNode;
  /** Use {@link PublicationFeedFooter} + {@link Pagination} for consistent chrome. */
  footer?: ReactNode;
  children: ReactNode;
} & Pick<React.ComponentProps<'section'>, 'aria-label' | 'className'>;

/**
 * Summary line + pagination under the list; same on browse and publisher.
 */
export function PublicationFeedFooter({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        registry_feed_x,
        'grid gap-4 border-t border-border pb-5 pt-5 sm:pb-6 sm:pt-5',
      )}
    >
      <div className="min-w-0 text-[12px] font-medium tabular-nums leading-relaxed text-muted-foreground">
        {summary}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * Unified registry publication table: column headers, loading skeleton, body, footer.
 */
export function PublicationFeedSection({
  loading,
  skeleton_rows = 8,
  show_column_headers = true,
  header,
  footer,
  children,
  'aria-label': aria_label,
  className,
}: PublicationFeedSectionProps) {
  return (
    <section
      aria-label={aria_label}
      aria-busy={loading || undefined}
      className={cn('grid min-w-0', className)}
    >
      <div className={cn(registry_feed_shell)}>
        {header}
        {show_column_headers ? <ReleaseListHeader /> : null}
        {loading ? (
          <ReleaseListSkeleton rows={skeleton_rows} />
        ) : (
          <div className="min-w-0">{children}</div>
        )}
        {footer ? <div className="min-w-0">{footer}</div> : null}
      </div>
    </section>
  );
}

/** Publication search hit: same grid and rhythm as `ReleaseRow`. */
export function SearchPublicationRow({ item }: { item: PublicationDto }) {
  const navigate = useNavigate();
  const publisher_address = item.publisher?.address;
  const releases = useMemo(
    () =>
      [...(item.releases ?? [])].sort((a, b) =>
        a.published_at < b.published_at ? 1 : -1,
      ),
    [item.releases],
  );
  const latest = releases[0];
  const target = `/publication/${encodeURIComponent(item.registry_id)}`;

  const go_publication = () => {
    void navigate(target);
  };

  const on_row_key_down = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      go_publication();
    }
  };

  const on_row_aux_click = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Publication ${item.registry_id}`}
      className={cn(
        'group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-4',
        'transition-[background-color,color] duration-200 ease-out',
        'hover:bg-surface/40 active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
      onClick={go_publication}
      onKeyDown={on_row_key_down}
      onAuxClick={on_row_aux_click}
    >
      <div className="grid min-w-0 gap-1.5 px-3 sm:px-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[15px] font-medium tracking-[-0.005em] text-foreground group-hover:underline">
            {item.registry_id}
          </span>
          {latest ? (
            <span className="font-mono text-[12px] tabular text-foreground-soft">
              {latest.version}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
          {publisher_address ? (
            <PublisherAddressLink
              address={publisher_address}
              onClick={(e) => e.stopPropagation()}
              className="font-mono tabular text-foreground-soft hover:text-foreground hover:underline"
            >
              {shorten(publisher_address, 6, 6)}
            </PublisherAddressLink>
          ) : (
            <span className="font-mono tabular text-muted-foreground">{format_empty}</span>
          )}
          <span aria-hidden className="text-muted-foreground/50">
            ·
          </span>
          <span>
            {releases.length} release{releases.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 px-3 sm:px-4">
        {latest ? (
          <span
            className="font-mono text-[11.5px] tabular text-muted-foreground"
            title={new Date(latest.published_at).toISOString()}
          >
            {format_relative_time(latest.published_at)}
          </span>
        ) : null}
        <ArrowUpRight
          className="size-3.5 text-muted-foreground transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    </div>
  );
}
