import { Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/Pagination';
import {
  PublicationFeedFooter,
  PublicationFeedSection,
  SearchPublicationRow,
} from '@/components/PublicationFeedSection';
import { PublicationList } from '@/components/ReleaseRow';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { api_error_message } from '@/lib/api';
import { usePublicationSearch } from '@/lib/queries';
import {
  registry_card_inset,
  registry_data_card,
  registry_empty_panel,
  registry_feed_x,
  registry_feed_y_gutter,
} from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export function SearchRoute() {
  const [params, set_params] = useSearchParams();
  const url_q = params.get('q') ?? '';
  const [query, set_query] = useState(url_q);
  const [last_url_q, set_last_url_q] = useState(url_q);
  if (last_url_q !== url_q) {
    set_last_url_q(url_q);
    set_query(url_q);
  }

  const [page, set_page] = useState(0);
  const [last_query, set_last_query] = useState(query);
  if (last_query !== query) {
    set_last_query(query);
    set_page(0);
  }

  const debounced_query = useDebouncedValue(query, 200);

  useEffect(() => {
    const trimmed = debounced_query.trim();
    if (trimmed === (params.get('q') ?? '')) return;

    if (trimmed) {
      set_params({ q: trimmed }, { replace: true });
    } else {
      set_params({}, { replace: true });
    }
  }, [debounced_query, params, set_params]);

  const offset = page * PAGE_SIZE;

  const search = usePublicationSearch({
    q: debounced_query,
    limit: PAGE_SIZE,
    offset,
    includes: 'releases,publisher',
  });

  const results = search.data ?? [];
  const has_next = results.length === PAGE_SIZE;
  const trimmed = debounced_query.trim();
  const showing_range_start = trimmed ? offset + 1 : 0;
  const showing_range_end = trimmed ? offset + results.length : 0;

  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Registry search
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
            Search publications by registry id.
          </h1>
        </div>
        <p className="max-w-[62ch] text-[15px] leading-[1.68] text-foreground-soft">
          Same idea as a publication registry: type part of a registry id, pick
          a match, then open the latest release or jump to an exact version with{' '}
          <span className="font-mono text-[0.95em] tabular text-foreground">
            registry_id@version
          </span>{' '}
          from the header search.
        </p>
      </header>

      <div className="grid gap-6">
        <SearchInput value={query} on_change={set_query} />

        {!trimmed ? (
          <EmptyQuery />
        ) : (
          <PublicationFeedSection
            aria-label="Search results"
            loading={search.isLoading}
            skeleton_rows={5}
            footer={
              <PublicationFeedFooter
                summary={
                  search.isLoading ? (
                    'Searching…'
                  ) : search.isError ? (
                    "Search isn't responding."
                  ) : results.length === 0 ? (
                    'No hits on this page.'
                  ) : (
                    <>
                      Showing{' '}
                      <span className="text-foreground-soft">
                        {showing_range_start}
                      </span>
                      –
                      <span className="text-foreground-soft">
                        {showing_range_end}
                      </span>{' '}
                      for <span className="text-foreground">{trimmed}</span>
                    </>
                  )
                }
              >
                <Pagination
                  page={page + 1}
                  has_prev={page > 0 && !search.isLoading && !search.isError}
                  has_next={has_next && !search.isLoading && !search.isError}
                  loading={search.isFetching}
                  on_prev={() => set_page((p) => Math.max(0, p - 1))}
                  on_next={() => set_page((p) => p + 1)}
                  with_top_border={false}
                />
              </PublicationFeedFooter>
            }
          >
            {search.isError ? (
              <div className={registry_card_inset}>
                <ErrorView
                  title="Search isn't responding"
                  message={api_error_message(
                    search.error,
                    "We can't reach the indexer right now. Try again in a moment.",
                  )}
                />
              </div>
            ) : results.length === 0 ? (
              <NoResults q={trimmed} />
            ) : (
              <PublicationList>
                {results.map((item) => (
                  <SearchPublicationRow key={item.id} item={item} />
                ))}
              </PublicationList>
            )}
          </PublicationFeedSection>
        )}
      </div>
    </Container>
  );
}

function SearchInput({
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
        registry_data_card,
        'flex items-stretch transition-[border-color,box-shadow,background-color] duration-200 ease-out focus-within:border-primary/35 focus-within:ring-primary/20',
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none flex select-none items-center pl-5 pr-2.5 text-muted-foreground"
      >
        <SearchIcon className="size-4" strokeWidth={1.85} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => on_change(e.target.value)}
        placeholder="Try atlas-manual, workshop-kit, …"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        className="h-14 min-w-0 flex-1 bg-transparent pr-2 font-mono tabular text-[15px] text-foreground placeholder:text-muted-foreground/55 focus:outline-none"
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

function EmptyQuery() {
  return (
    <div className={registry_data_card}>
      <div className={cn(registry_feed_x, registry_feed_y_gutter)}>
        <div className={registry_empty_panel}>
          <SearchIcon
            className="size-5 text-muted-foreground"
            strokeWidth={1.6}
            aria-hidden
          />
          <p className="text-[14px] text-foreground">
            Start typing to search the registry.
          </p>
          <p className="max-w-[42ch] text-[12.5px] leading-[1.65] text-muted-foreground">
            The first publisher to register a registry id keeps it. Partial
            matches work — you don&rsquo;t need the full slug.
          </p>
        </div>
      </div>
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className={cn(registry_feed_x, registry_feed_y_gutter)}>
      <div className={registry_empty_panel}>
        <SearchIcon
          className="size-5 text-muted-foreground"
          strokeWidth={1.6}
          aria-hidden
        />
        <p className="text-[14px] text-foreground">
          Nothing matches <span className="font-mono tabular">{q}</span>.
        </p>
        <p className="max-w-[40ch] text-[12.5px] leading-[1.65] text-muted-foreground">
          Check the spelling, or browse what&apos;s been published recently —
          the author may not have published yet.
        </p>
      </div>
    </div>
  );
}
