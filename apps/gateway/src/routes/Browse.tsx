import { Compass, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { Pagination } from '@/components/Pagination';
import {
  ReleaseListHeader,
  ReleaseListSkeleton,
  ReleaseRow,
} from '@/components/ReleaseRow';
import { api_error_message } from '@/lib/api';
import { useFeed } from '@/lib/queries';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

/** Keep the refresh affordance visible even when the refetch finishes quickly. */
const MIN_REFRESH_SPIN_MS = 420;

export function BrowseRoute() {
  const [page, set_page] = useState(0);
  const [manual_refresh, set_manual_refresh] = useState(false);
  const offset = page * PAGE_SIZE;

  const feed = useFeed({
    limit: PAGE_SIZE,
    offset,
    includes: 'publisher,name',
  });

  const releases = feed.data ?? [];
  const has_next = releases.length === PAGE_SIZE;
  const refresh_locked = manual_refresh || feed.isFetching;

  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          New publications
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
            Everything publishing right now.
          </h1>
          <button
            type="button"
            aria-busy={manual_refresh}
            onClick={() => {
              set_manual_refresh(true);
              void Promise.all([
                feed.refetch(),
                new Promise<void>((resolve) => {
                  setTimeout(resolve, MIN_REFRESH_SPIN_MS);
                }),
              ]).finally(() => set_manual_refresh(false));
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-none border border-border px-2.5 py-1.5 text-[12px] text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed"
            disabled={refresh_locked}
          >
            <RefreshCw
              className={cn(
                'size-3.5',
                manual_refresh && 'motion-safe:animate-spin',
              )}
              strokeWidth={1.85}
              aria-hidden
            />
            Refresh
          </button>
        </div>
        <p className="max-w-[62ch] text-[15px] leading-[1.68] text-foreground-soft">
          A living feed of new publications — each row is a signed, immutable
          release. Open one to read it.
        </p>
      </header>

      <section className="grid gap-2">
        <ReleaseListHeader />
        {feed.isLoading ? (
          <ReleaseListSkeleton rows={8} />
        ) : feed.isError ? (
          <ErrorView
            title="Couldn't load the feed"
            message={api_error_message(feed.error, "We can't reach the indexer right now. Try again in a moment.")}
          />
        ) : releases.length === 0 ? (
          <EmptyFeed />
        ) : (
          <div className="divide-y divide-border">
            {releases.map((r) => (
              <ReleaseRow key={r.id} release={r} />
            ))}
          </div>
        )}
        {!feed.isLoading && !feed.isError ? (
          <Pagination
            page={page + 1}
            has_prev={page > 0}
            has_next={has_next}
            loading={feed.isFetching}
            on_prev={() => set_page((p) => Math.max(0, p - 1))}
            on_next={() => set_page((p) => p + 1)}
          />
        ) : null}
      </section>
    </Container>
  );
}

function EmptyFeed() {
  return (
    <div className="grid place-items-center gap-3 rounded-none border border-dashed border-border px-6 py-16 text-center">
      <Compass
        className="size-5 text-muted-foreground"
        strokeWidth={1.6}
        aria-hidden
      />
      <p className="text-[14px] text-foreground">Nothing here yet.</p>
      <p className="max-w-[40ch] text-[12.5px] leading-[1.65] text-muted-foreground">
        Publications show up here the moment they&rsquo;re published. You could
        be the first.
      </p>
    </div>
  );
}
