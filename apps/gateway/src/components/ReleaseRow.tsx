import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { format_bytes, format_relative_time, shorten } from '@/lib/format';
import type { ReleaseDto } from '@/lib/queries';

export function ReleaseRow({ release }: { release: ReleaseDto }) {
  const name = release.name?.name ?? release.name_id;
  const publisher = release.publisher?.address ?? release.publisher_id;
  const target = `/r/${encodeURIComponent(name)}/${encodeURIComponent(release.version)}`;

  return (
    <Link
      to={target}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-5 transition-colors hover:bg-surface/40 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] sm:py-4"
    >
      <div className="grid min-w-0 gap-1.5 px-1 sm:px-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[15px] font-medium tracking-[-0.005em] text-foreground group-hover:underline">
            {name}
          </span>
          <span className="font-mono text-[12px] tabular text-foreground-soft">
            {release.version}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
          <Link
            to={`/p/${encodeURIComponent(publisher)}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono tabular text-foreground-soft hover:text-foreground hover:underline"
            title={publisher}
          >
            {shorten(publisher, 6, 6)}
          </Link>
          <Dot />
          <span>{format_bytes(release.content_size_bytes)}</span>
        </div>
      </div>

      <div className="hidden min-w-0 sm:block sm:px-2">
        <p className="truncate font-mono text-[11.5px] tabular text-muted-foreground">
          {shorten(release.address, 8, 8)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 px-1 sm:px-2">
        <span
          className="font-mono text-[11.5px] tabular text-muted-foreground"
          title={new Date(release.published_at).toISOString()}
        >
          {format_relative_time(release.published_at)}
        </span>
        <ArrowUpRight
          className="size-3.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    </Link>
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
    <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] gap-x-6 border-b border-border pb-2 text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:grid">
      <div className="px-2">Release</div>
      <div className="px-2">Address</div>
      <div className="px-2 text-right">Published</div>
    </div>
  );
}

export function ReleaseListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy aria-live="polite">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] items-center gap-x-6 py-5"
        >
          <div className="grid gap-2 px-2">
            <div className="h-4 w-2/3 max-w-[16rem] animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-1/3 max-w-[10rem] animate-pulse rounded-md bg-muted/70" />
          </div>
          <div className="hidden h-3 w-3/4 max-w-[14rem] animate-pulse rounded-md bg-muted/70 sm:block sm:px-2" />
          <div className="h-3 w-20 animate-pulse rounded-md bg-muted/70 px-2" />
        </div>
      ))}
    </div>
  );
}
