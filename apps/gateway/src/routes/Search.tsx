import { ArrowUpRight, Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { Pagination } from '@/components/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { api_error_message } from '@/lib/api';
import { format_relative_time, shorten } from '@/lib/format';
import { useNameSearch, type NameDto } from '@/lib/queries';
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

  const search = useNameSearch({
    q: debounced_query,
    limit: PAGE_SIZE,
    includes: 'releases',
  });

  const results = search.data ?? [];
  const has_next = results.length === PAGE_SIZE;
  const trimmed = debounced_query.trim();

  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Search
        </p>
        <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
          Find a release.
        </h1>
        <p className="max-w-[60ch] text-[14.5px] leading-[1.6] text-foreground-soft">
          Forgiving name search across the registry. Trigram-matched on the
          publisher-claimed name — partial words and typos still surface
          results.
        </p>
      </header>

      <div className="max-w-3xl">
        <SearchInput value={query} on_change={set_query} />
      </div>

      <section className="grid gap-3">
        {!trimmed ? (
          <EmptyQuery />
        ) : search.isLoading ? (
          <ResultsSkeleton />
        ) : search.isError ? (
          <ErrorView
            title="Search failed"
            message={api_error_message(search.error, 'Indexer is unreachable.')}
          />
        ) : results.length === 0 ? (
          <NoResults q={trimmed} />
        ) : (
          <ResultsList results={results} />
        )}

        {trimmed && !search.isLoading && !search.isError ? (
          <Pagination
            page={page + 1}
            has_prev={page > 0}
            has_next={has_next}
            loading={search.isFetching}
            on_prev={() => set_page((p) => Math.max(0, p - 1))}
            on_next={() => set_page((p) => p + 1)}
          />
        ) : null}
      </section>
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
      className="flex items-stretch overflow-hidden rounded-2xl border border-border-strong/70 bg-card shadow-[0_1px_0_0_rgb(0_0_0/0.02)] transition-colors focus-within:border-foreground/35"
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
        placeholder="gutenberg-demo"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        className="h-14 min-w-0 flex-1 bg-transparent pr-2 font-mono tabular text-[15px] text-foreground placeholder:text-muted-foreground/55 focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => on_change('')}
          className="mr-2 my-2 inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface hover:text-foreground active:translate-y-px"
        >
          <X className="size-3.5" strokeWidth={1.85} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function ResultsList({ results }: { results: NameDto[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {results.map((item) => (
        <SearchResultRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function SearchResultRow({ item }: { item: NameDto }) {
  const navigate = useNavigate();
  const releases = useMemo(
    () =>
      [...(item.releases ?? [])].sort((a, b) =>
        a.published_at < b.published_at ? 1 : -1,
      ),
    [item.releases],
  );
  const latest = releases[0];

  return (
    <article
      className={cn(
        'group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-5 transition-colors hover:bg-surface/40',
      )}
      onClick={() => void navigate(`/r/${encodeURIComponent(item.name)}`)}
    >
      <div className="grid min-w-0 gap-1.5 px-1 sm:px-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="truncate text-[16px] font-medium tracking-[-0.005em] text-foreground group-hover:underline">
            {item.name}
          </h3>
          {latest ? (
            <span className="font-mono text-[12px] tabular text-foreground-soft">
              {latest.version}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
          <Link
            to={`/p/${encodeURIComponent(item.publisher_id)}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono tabular text-foreground-soft hover:text-foreground hover:underline"
            title={item.publisher_id}
          >
            {shorten(item.publisher_id, 4, 4)}
          </Link>
          {latest ? (
            <>
              <Dot />
              <span>{format_relative_time(latest.published_at)}</span>
            </>
          ) : null}
          <Dot />
          <span>
            {releases.length} version{releases.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <ArrowUpRight
        className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
    </article>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/50">
      ·
    </span>
  );
}

function ResultsSkeleton() {
  return (
    <div
      aria-busy
      aria-live="polite"
      className="divide-y divide-border border-y border-border"
    >
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="grid gap-2 py-5 px-2">
          <div className="h-4 w-2/5 max-w-[14rem] animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-1/3 max-w-[10rem] animate-pulse rounded-md bg-muted/70" />
        </div>
      ))}
    </div>
  );
}

function EmptyQuery() {
  return (
    <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <SearchIcon className="size-5 text-muted-foreground" strokeWidth={1.6} aria-hidden />
      <p className="text-[14px] text-foreground">Type a name to search.</p>
      <p className="max-w-[40ch] text-[12.5px] leading-relaxed text-muted-foreground">
        Names are claimed by publishers on first publish. Search is forgiving —
        partial words and typos still surface results.
      </p>
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <p className="text-[14px] text-foreground">
        No name matches{' '}
        <span className="font-mono tabular">{q}</span>.
      </p>
      <p className="max-w-[40ch] text-[12.5px] leading-relaxed text-muted-foreground">
        Names are claimed on first publish. The publisher you’re looking for
        may not have claimed a release yet.
      </p>
    </div>
  );
}
