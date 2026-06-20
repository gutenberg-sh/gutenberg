import { Compass, RefreshCw, Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  SearchPublicationRow,
} from '@/components/PublicationFeedSection';
import { PublicationList, ReleaseRow } from '@/components/ReleaseRow';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { api_error_message } from '@/lib/api';
import { useFeed, usePublicationSearch } from '@/lib/queries';
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
  const [params, set_params] = useSearchParams();
  const url_q = params.get('q') ?? '';
  const [query, set_query] = useState(url_q);
  const [last_url_q, set_last_url_q] = useState(url_q);
  if (last_url_q !== url_q) {
    set_last_url_q(url_q);
    set_query(url_q);
  }

  const [page, set_page] = useState(0);
  const debounced_query = useDebouncedValue(query, 200);
  const trimmed = debounced_query.trim();
  const is_searching = trimmed.length > 0;

  const [last_mode_key, set_last_mode_key] = useState(trimmed);
  if (last_mode_key !== trimmed) {
    set_last_mode_key(trimmed);
    set_page(0);
  }

  useEffect(() => {
    if (trimmed === (params.get('q') ?? '')) return;

    if (trimmed) {
      set_params({ q: trimmed }, { replace: true });
    } else {
      set_params({}, { replace: true });
    }
  }, [trimmed, params, set_params]);

  const offset = page * PAGE_SIZE;

  const [manual_refresh, set_manual_refresh] = useState(false);
  const feed = useFeed({
    limit: PAGE_SIZE,
    offset,
    includes: 'publisher,publication',
  });

  const search = usePublicationSearch(
    {
      q: debounced_query,
      limit: PAGE_SIZE,
      offset,
      includes: 'releases,publisher',
    },
    { enabled: is_searching },
  );

  const releases = feed.data ?? [];
  const results = search.data ?? [];
  const has_next = is_searching
    ? results.length === PAGE_SIZE
    : releases.length === PAGE_SIZE;
  const refresh_locked = manual_refresh || feed.isFetching;
  const loading = is_searching ? search.isLoading : feed.isLoading;
  const fetching = is_searching ? search.isFetching : feed.isFetching;
  const is_error = is_searching ? search.isError : feed.isError;
  const error = is_searching ? search.error : feed.error;
  const item_count = is_searching ? results.length : releases.length;
  const range_start = offset + 1;
  const range_end = offset + item_count;

  return (
    <RegistryPageLayout
      eyebrow="Solana registry"
      title={<RegistryPageTitle>Explore</RegistryPageTitle>}
      headerAside={
        !is_searching ? (
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
        ) : null
      }
    >
      <PublicationFeedSection
        aria-label={is_searching ? 'Search results' : 'New releases feed'}
        loading={loading}
        skeleton_rows={is_searching ? 5 : 8}
        header={<ExploreSearchField value={query} on_change={set_query} />}
        footer={
          <PublicationFeedFooter
            summary={
              loading ? (
                is_searching ? (
                  'Searching…'
                ) : (
                  'Loading releases…'
                )
              ) : is_error ? (
                is_searching ? (
                  "Search isn't responding."
                ) : (
                  "Couldn't load this page."
                )
              ) : item_count === 0 ? (
                is_searching ? (
                  'No matches on this page.'
                ) : (
                  'No releases on this page.'
                )
              ) : (
                <>
                  Showing{' '}
                  <span className="text-foreground-soft">{range_start}</span>-
                  <span className="text-foreground-soft">{range_end}</span>
                  {is_searching ? (
                    <>
                      {' '}
                      for <span className="text-foreground">{trimmed}</span>
                    </>
                  ) : null}
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
              has_prev={page > 0 && !loading && !is_error}
              has_next={has_next && !loading && !is_error}
              loading={fetching}
              on_prev={() => set_page((p) => Math.max(0, p - 1))}
              on_next={() => set_page((p) => p + 1)}
              with_top_border={false}
            />
          </PublicationFeedFooter>
        }
      >
        {is_error ? (
          <div className={registry_card_inset}>
            <ErrorView
              title={
                is_searching
                  ? "Search isn't responding"
                  : "Couldn't load the feed"
              }
              message={api_error_message(
                error,
                "We can't reach the indexer right now. Try again in a moment.",
              )}
            />
          </div>
        ) : is_searching ? (
          results.length === 0 ? (
            <NoResults q={trimmed} />
          ) : (
            <PublicationList>
              {results.map((item) => (
                <SearchPublicationRow key={item.id} item={item} />
              ))}
            </PublicationList>
          )
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

function ExploreSearchField({
  value,
  on_change,
}: {
  value: string;
  on_change: (next: string) => void;
}) {
  return (
    <div
      role="search"
      aria-label="Search the registry"
      className={cn(
        registry_feed_x,
        'flex items-stretch border-b border-border transition-colors duration-200 ease-out',
        'focus-within:border-primary/50',
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none flex select-none items-center pr-2.5 text-muted-foreground"
      >
        <SearchIcon className="size-4" strokeWidth={1.85} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => on_change(e.target.value)}
        placeholder="Search by registry id, or browse latest releases below"
        spellCheck={false}
        autoComplete="off"
        className="h-12 min-w-0 flex-1 bg-transparent pr-2 font-mono tabular text-[14px] text-foreground placeholder:text-muted-foreground/75 focus:outline-none"
      />
      <div
        className="mr-2 my-2 flex size-9 shrink-0 items-center justify-center"
        aria-hidden={!value}
      >
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={() => on_change('')}
            className="rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={1.85} aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
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
          Publications show up here the moment they&rsquo;re published.
        </p>
      </div>
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className={cn(registry_feed_x, registry_feed_y_gutter)}>
      <div className={registry_empty_simple}>
        <SearchIcon
          className="size-5 text-muted-foreground"
          strokeWidth={1.6}
          aria-hidden
        />
        <p className="text-[14px] text-foreground">
          Nothing matches <span className="font-mono tabular">{q}</span>.
        </p>
        <p className="max-w-[40ch] text-[12.5px] leading-[1.65] text-muted-foreground">
          Check the spelling, or clear search to browse recent releases.
        </p>
      </div>
    </div>
  );
}
