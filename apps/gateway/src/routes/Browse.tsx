import { Compass, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/Pagination';
import {
  PublicationFeedFooter,
  PublicationFeedSection,
} from '@/components/PublicationFeedSection';
import { PublicationList, ReleaseRow } from '@/components/ReleaseRow';
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
    includes: 'publisher,publication',
  });

  const releases = feed.data ?? [];
  const has_next = releases.length === PAGE_SIZE;
  const refresh_locked = manual_refresh || feed.isFetching;

  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          New releases
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
            Everything publishing right now.
          </h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
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
            className="gap-1.5 px-2.5 py-1.5 text-[12px] text-foreground-soft hover:border-border-strong hover:text-foreground"
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
          </Button>
        </div>
        <p className="max-w-[62ch] text-[15px] leading-[1.68] text-foreground-soft">
          A living feed of new releases — each row is one signed, immutable
          version. Open one to read it.
        </p>
      </header>

      <PublicationFeedSection
        aria-label="New releases feed"
        loading={feed.isLoading}
        skeleton_rows={8}
        footer={
          <PublicationFeedFooter
            summary={
              feed.isLoading ? (
                'Loading releases…'
              ) : feed.isError ? (
                "Couldn't load this page."
              ) : releases.length === 0 ? (
                'No releases on this page.'
              ) : (
                <>
                  Showing{' '}
                  <span className="text-foreground-soft">{offset + 1}</span>–
                  <span className="text-foreground-soft">
                    {offset + releases.length}
                  </span>
                  {has_next
                    ? ' · more on the next page'
                    : page > 0
                      ? ' · end of list'
                      : null}
                </>
              )
            }
          >
            <Pagination
              page={page + 1}
              has_prev={page > 0 && !feed.isLoading && !feed.isError}
              has_next={has_next && !feed.isLoading && !feed.isError}
              loading={feed.isFetching}
              on_prev={() => set_page((p) => Math.max(0, p - 1))}
              on_next={() => set_page((p) => p + 1)}
              with_top_border={false}
            />
          </PublicationFeedFooter>
        }
      >
        {feed.isError ? (
          <ErrorView
            title="Couldn't load the feed"
            message={api_error_message(
              feed.error,
              "We can't reach the indexer right now. Try again in a moment.",
            )}
          />
        ) : releases.length === 0 ? (
          <EmptyFeed />
        ) : (
          <PublicationList>
            {releases.map((r) => (
              <ReleaseRow key={r.id} release={r} />
            ))}
          </PublicationList>
        )}
      </PublicationFeedSection>
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
