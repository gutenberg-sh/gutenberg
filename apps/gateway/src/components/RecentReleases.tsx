import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Pagination } from '@/components/Pagination';
import {
  PublicationFeedFooter,
  PublicationFeedSection,
} from '@/components/PublicationFeedSection';
import { PublicationList, ReleaseRow } from '@/components/ReleaseRow';
import { useFeed } from '@/lib/queries';

export function RecentReleases({ limit = 8 }: { limit?: number }) {
  const [page, set_page] = useState(0);
  const offset = page * limit;
  const feed = useFeed({ limit, offset, includes: 'publisher,publication' });

  if (feed.isError) {
    return null;
  }

  const releases = feed.data ?? [];
  const has_next = releases.length === limit;
  const range_start = offset + 1;
  const range_end = offset + releases.length;

  return (
    <section aria-label="Recently published" className="grid gap-5">
      <header className="flex items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Recently published
          </p>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground sm:text-[26px]">
            Fresh publications hitting the registry.
          </h2>
        </div>
        <Link
          to="/browse"
          className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-foreground-soft transition-colors hover:text-foreground"
        >
          Browse all
          <ArrowUpRight className="size-3" strokeWidth={1.85} aria-hidden />
        </Link>
      </header>

      <PublicationFeedSection
        aria-label="Recently published releases"
        loading={feed.isLoading}
        skeleton_rows={limit}
        footer={
          <PublicationFeedFooter
            summary={
              feed.isLoading ? (
                'Loading publications…'
              ) : releases.length === 0 ? (
                'No publications on this page.'
              ) : (
                <>
                  Showing{' '}
                  <span className="text-foreground-soft">{range_start}</span>–
                  <span className="text-foreground-soft">{range_end}</span>
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
              has_prev={page > 0 && !feed.isLoading}
              has_next={has_next && !feed.isLoading}
              loading={feed.isFetching}
              on_prev={() => set_page((p) => Math.max(0, p - 1))}
              on_next={() => set_page((p) => p + 1)}
              with_top_border={false}
            />
          </PublicationFeedFooter>
        }
      >
        {feed.isLoading ? null : releases.length === 0 ? (
          <Empty />
        ) : (
          <PublicationList>
            {releases.map((release) => (
              <ReleaseRow key={release.id} release={release} />
            ))}
          </PublicationList>
        )}
      </PublicationFeedSection>
    </section>
  );
}

function Empty() {
  return (
    <p className="rounded-none border border-dashed border-border px-6 py-8 text-center text-[12.5px] text-muted-foreground">
      Nothing has been published yet. The first one is up for grabs.
    </p>
  );
}
