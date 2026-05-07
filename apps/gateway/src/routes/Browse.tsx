import { Compass, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ErrorView } from '@/components/ErrorView';
import {
  RegistryPageLayout,
  RegistryPageTitle,
} from '@/components/RegistryPageLayout';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/Pagination';
import {
  PublicationFeedFooter,
  PublicationFeedSection,
} from '@/components/PublicationFeedSection';
import { PublicationList, ReleaseRow } from '@/components/ReleaseRow';
import { api_error_message } from '@/lib/api';
import { useFeed } from '@/lib/queries';
import {
  registry_card_inset,
  registry_empty_simple,
  registry_feed_x,
  registry_feed_y_gutter,
} from '@/lib/registry-surface';
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
    <RegistryPageLayout
      eyebrow="New releases"
      title={
        <RegistryPageTitle>Everything publishing right now.</RegistryPageTitle>
      }
      description={
        <p>
          A living feed of new releases — each row is one signed, immutable
          version. Open one to read it.
        </p>
      }
      headerAside={
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
      }
    >
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
          <div className={registry_card_inset}>
            <ErrorView
              title="Couldn't load the feed"
              message={api_error_message(
                feed.error,
                "We can't reach the indexer right now. Try again in a moment.",
              )}
            />
          </div>
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
    </RegistryPageLayout>
  );
}

function EmptyFeed() {
  return (
    <div className={cn(registry_feed_x, registry_feed_y_gutter)}>
      <div className={registry_empty_simple}>
        <Compass
          className="size-5 text-muted-foreground"
          strokeWidth={1.6}
          aria-hidden
        />
        <p className="text-[14px] text-foreground">Nothing here yet.</p>
        <p className="max-w-[40ch] text-[12.5px] leading-[1.65] text-muted-foreground">
          Publications show up here the moment they&rsquo;re published. You
          could be the first.
        </p>
      </div>
    </div>
  );
}
