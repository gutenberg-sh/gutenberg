import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PublisherAddressLink } from '@/components/PublisherAddressLink';
import { format_bytes, format_relative_time, shorten } from '@/lib/format';
import type { ReleaseDto } from '@/lib/queries';
import { registry_feed_x } from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

/** Shared list container: horizontal rules only (matches browse / publisher / search). */
export function PublicationList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border/30">{children}</div>;
}

export function ReleaseRow({ release }: { release: ReleaseDto }) {
  const navigate = useNavigate();
  const registry_id =
    release.publication?.registry_id ?? release.publication_id;
  const publisher_address = release.publisher?.address;
  const target = `/publication/${encodeURIComponent(registry_id)}/${encodeURIComponent(release.version)}`;

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
      aria-label={`Publication ${registry_id}, version ${release.version}`}
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
            {registry_id}
          </span>
          <span className="font-mono text-[12px] tabular text-foreground-soft">
            {release.version}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
          {publisher_address ? (
            <>
              <PublisherAddressLink
                address={publisher_address}
                onClick={(e) => e.stopPropagation()}
                className="font-mono tabular text-foreground-soft hover:text-foreground hover:underline"
              >
                {shorten(publisher_address, 6, 6)}
              </PublisherAddressLink>
              <Dot />
            </>
          ) : (
            <>
              <span className="font-mono tabular text-muted-foreground">—</span>
              <Dot />
            </>
          )}
          <span className="font-mono tabular">
            {format_bytes(release.content_size_bytes)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 px-3 sm:px-4">
        <span
          className="font-mono text-[11.5px] tabular text-muted-foreground"
          title={new Date(release.published_at).toISOString()}
        >
          {format_relative_time(release.published_at)}
        </span>
        <ArrowUpRight
          className="size-3.5 text-muted-foreground transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/50">
      ·
    </span>
  );
}

export function ReleaseListHeader() {
  return (
    <div
      className={cn(
        registry_feed_x,
        'hidden grid-cols-[minmax(0,1fr)_auto] gap-x-6 border-b border-border/25 bg-elevated/20 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:grid sm:py-3',
      )}
    >
      <div className="min-w-0">Registry ID</div>
      <div className="text-right tabular-nums">Published</div>
    </div>
  );
}

export function ReleaseListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/30" aria-busy aria-live="polite">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 py-4"
        >
          <div className="grid gap-2 px-3 sm:px-4">
            <div className="h-4 w-2/3 max-w-[16rem] motion-safe:animate-pulse rounded-lg bg-muted" />
            <div className="h-3 w-1/3 max-w-40 motion-safe:animate-pulse rounded-lg bg-muted/70" />
          </div>
          <div className="h-3 w-20 motion-safe:animate-pulse rounded-lg bg-muted/70 px-3 sm:px-4" />
        </div>
      ))}
    </div>
  );
}
