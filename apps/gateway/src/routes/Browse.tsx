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

const PAGE_SIZE = 20;

export function BrowseRoute() {
  const [page, set_page] = useState(0);
  const offset = page * PAGE_SIZE;

  const feed = useFeed({
    limit: PAGE_SIZE,
    offset,
    includes: 'publisher,name',
  });

  const releases = feed.data ?? [];
  const has_next = releases.length === PAGE_SIZE;

  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Browse
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
            Recently published.
          </h1>
          <button
            type="button"
            onClick={() => void feed.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground"
            disabled={feed.isFetching}
          >
            <RefreshCw
              className={feed.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'}
              strokeWidth={1.85}
              aria-hidden
            />
            Refresh
          </button>
        </div>
        <p className="max-w-[60ch] text-[14.5px] leading-[1.6] text-foreground-soft">
          A live, append-only stream of every release indexed from the
          Gutenberg registry on Solana. Click a name to verify and read it
          in your browser.
        </p>
      </header>

      <section className="grid gap-2">
        <ReleaseListHeader />
        {feed.isLoading ? (
          <ReleaseListSkeleton rows={8} />
        ) : feed.isError ? (
          <ErrorView
            title="Could not load the feed"
            message={api_error_message(feed.error, 'Indexer is unreachable.')}
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
    <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <Compass
        className="size-5 text-muted-foreground"
        strokeWidth={1.6}
        aria-hidden
      />
      <p className="text-[14px] text-foreground">No releases indexed yet.</p>
      <p className="max-w-[40ch] text-[12.5px] leading-relaxed text-muted-foreground">
        As soon as a publisher records a release on Solana, the indexer
        picks it up and it appears here.
      </p>
    </div>
  );
}
