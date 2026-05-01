import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { format_relative_time, shorten } from '@/lib/format';
import { useFeed, type ReleaseDto } from '@/lib/queries';

export function RecentReleases({ limit = 6 }: { limit?: number }) {
  const feed = useFeed({ limit, includes: 'publisher,name' });

  if (feed.isError) {
    return null;
  }

  return (
    <section
      aria-label="Recently published releases"
      className="grid gap-3 lg:gap-4"
    >
      <div className="flex items-baseline justify-between gap-3 px-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Recently published
        </p>
        <Link
          to="/browse"
          className="inline-flex items-center gap-1 text-[12px] text-foreground-soft transition-colors hover:text-foreground"
        >
          Browse all
          <ArrowUpRight className="size-3" strokeWidth={1.85} aria-hidden />
        </Link>
      </div>

      {feed.isLoading ? (
        <Skeleton rows={limit} />
      ) : (feed.data?.length ?? 0) === 0 ? (
        <Empty />
      ) : (
        <ol className="grid divide-y divide-border border-y border-border">
          {(feed.data ?? []).map((release) => (
            <li key={release.id}>
              <CompactRow release={release} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CompactRow({ release }: { release: ReleaseDto }) {
  const name = release.name?.name ?? release.name_id;
  const publisher = release.publisher?.address ?? release.publisher_id;
  const target = `/r/${encodeURIComponent(name)}/${encodeURIComponent(release.version)}`;

  return (
    <Link
      to={target}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-1 py-3 transition-colors hover:bg-surface/40"
    >
      <div className="grid min-w-0 gap-0.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[14px] font-medium text-foreground group-hover:underline">
            {name}
          </span>
          <span className="font-mono text-[11.5px] tabular text-foreground-soft">
            {release.version}
          </span>
        </div>
        <span className="font-mono text-[11px] tabular text-muted-foreground">
          {shorten(publisher, 4, 4)} · {format_relative_time(release.published_at)}
        </span>
      </div>
      <ArrowUpRight
        className="size-3.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
        strokeWidth={1.85}
        aria-hidden
      />
    </Link>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <ol
      aria-busy
      aria-live="polite"
      className="grid divide-y divide-border border-y border-border"
    >
      {Array.from({ length: rows }).map((_, idx) => (
        <li key={idx} className="grid gap-1.5 px-1 py-3">
          <div className="h-3.5 w-1/2 max-w-[12rem] animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-1/3 max-w-[10rem] animate-pulse rounded-md bg-muted/70" />
        </li>
      ))}
    </ol>
  );
}

function Empty() {
  return (
    <p className="border-y border-dashed border-border px-1 py-6 text-center text-[12.5px] text-muted-foreground">
      Indexer is online but no releases have been published yet.
    </p>
  );
}
