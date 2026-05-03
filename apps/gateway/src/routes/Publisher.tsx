import { Check, Copy, ExternalLink, Info, Library } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { PublisherAvatar } from '@/components/PublisherAvatar';
import { Pagination } from '@/components/Pagination';
import {
  ReleaseListHeader,
  ReleaseListSkeleton,
  ReleaseRow,
} from '@/components/ReleaseRow';
import { api_error_message } from '@/lib/api';
import { explorer_address_url } from '@/lib/explorer';
import { format_date_short } from '@/lib/format';
import { usePublisher, usePublisherReleases } from '@/lib/queries';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

const chip_focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function PublisherRoute() {
  const params = useParams();
  const address = params.address;
  const [page, set_page] = useState(0);

  const publisher = usePublisher(address);
  const releases = usePublisherReleases(address, {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    includes: 'name',
  });

  if (!address) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Missing publisher address"
          message="Publisher pages live at /p/<address>. Add the public key to the URL and try again."
        />
      </Container>
    );
  }

  if (publisher.isError) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Publisher not found"
          message={api_error_message(publisher.error, "We don't have a record of this address. Double-check the public key, or browse recent publications.")}
        />
      </Container>
    );
  }

  const list = releases.data ?? [];
  const has_next = list.length === PAGE_SIZE;
  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Publisher
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-end gap-4 sm:gap-6">
            <PublisherAvatar address={address} size={88} className="shrink-0" />
            <div className="grid min-w-0 gap-2">
              <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
                Anonymous
              </h1>
              <p className="break-all font-mono text-[13px] tabular leading-[1.45] text-foreground-soft sm:text-[14px]">
                {address}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyChip value={address} label="address" />
            <a
              href={explorer_address_url(address)}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-none border border-border px-2.5 py-1.5 text-[12px] text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground',
                chip_focus,
              )}
            >
              <ExternalLink className="size-3.5" strokeWidth={1.85} aria-hidden />
              Explorer
            </a>
          </div>
        </div>
        {publisher.data ? (
          <p className="text-[12.5px] text-muted-foreground">
            First seen{' '}
            <span className="font-mono tabular text-foreground-soft">
              {format_date_short(publisher.data.created_at)}
            </span>
          </p>
        ) : publisher.isLoading ? (
          <div className="h-4 max-w-xs animate-pulse bg-muted/70" aria-hidden />
        ) : null}
      </header>

      <aside
        className="flex gap-3 rounded-none border border-border bg-surface px-4 py-3 sm:px-5 sm:py-4"
        aria-label="How publisher keys work"
      >
        <Info
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.85}
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground-soft">
          The publisher is fully anonymous: no profile or display name, only this public address. Use Copy or Explorer to see the same entries on the blockchain and confirm them yourself.
        </p>
      </aside>

      <section className="grid gap-2">
        <ReleaseListHeader />
        {releases.isLoading ? (
          <ReleaseListSkeleton rows={6} />
        ) : releases.isError ? (
          <ErrorView
            title="Couldn't load this publisher's publications"
            message={api_error_message(releases.error, "We can't reach the indexer right now. Try again in a moment.")}
          />
        ) : list.length === 0 ? (
          <EmptyReleases />
        ) : (
          <div className="divide-y divide-border">
            {list.map((r) => (
              <ReleaseRow key={r.id} release={r} />
            ))}
          </div>
        )}
        {!releases.isLoading && !releases.isError && list.length > 0 ? (
          <Pagination
            page={page + 1}
            has_prev={page > 0}
            has_next={has_next}
            loading={releases.isFetching}
            on_prev={() => set_page((p) => Math.max(0, p - 1))}
            on_next={() => set_page((p) => p + 1)}
          />
        ) : null}
      </section>
    </Container>
  );
}

function EmptyReleases() {
  return (
    <div className="grid place-items-center gap-3 rounded-none border border-dashed border-border px-6 py-16 text-center">
      <Library
        className="size-5 text-muted-foreground"
        strokeWidth={1.6}
        aria-hidden
      />
      <p className="text-[14px] text-foreground">No publications yet.</p>
      <p className="max-w-[40ch] text-[12.5px] leading-[1.65] text-muted-foreground">
        This key is registered but has not signed a release we have indexed.
      </p>
    </div>
  );
}

function CopyChip({ value, label }: { value: string; label: string }) {
  const [copied, set_copied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => set_copied(false), 1400);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => set_copied(true))
          .catch(() => set_copied(false));
      }}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-none border border-border px-2.5 py-1.5 text-[12px] text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed',
        chip_focus,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-accent" strokeWidth={2.4} aria-hidden />
      ) : (
        <Copy className="size-3.5" strokeWidth={1.85} aria-hidden />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
