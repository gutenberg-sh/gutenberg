import { Check, Copy, ExternalLink, Hash, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { Pagination } from '@/components/Pagination';
import {
  ReleaseListHeader,
  ReleaseListSkeleton,
  ReleaseRow,
} from '@/components/ReleaseRow';
import { api_error_message } from '@/lib/api';
import { explorer_address_url } from '@/lib/explorer';
import { format_date_short, shorten } from '@/lib/format';
import { usePublisher, usePublisherReleases } from '@/lib/queries';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

export function PublisherRoute() {
  const params = useParams();
  const address = params.address;
  const [page, set_page] = useState(0);

  const publisher = usePublisher(address, 'names');
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
          message="Open a publisher via /p/<address>."
        />
      </Container>
    );
  }

  if (publisher.isError) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Publisher not found"
          message={api_error_message(publisher.error, 'No record on the indexer.')}
        />
      </Container>
    );
  }

  const list = releases.data ?? [];
  const has_next = list.length === PAGE_SIZE;

  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Publisher
        </p>

        {publisher.isLoading ? (
          <PublisherHeaderSkeleton />
        ) : (
          <>
            <h1 className="break-all font-mono text-[18px] font-medium tabular leading-tight text-foreground sm:text-[22px]">
              {address}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
              <CopyChip value={address} label="address" />
              <a
                href={explorer_address_url(address)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground"
              >
                <ExternalLink className="size-3" strokeWidth={1.85} aria-hidden />
                Explorer
              </a>
              {publisher.data ? (
                <span className="ml-auto font-mono tabular">
                  First seen {format_date_short(publisher.data.created_at)}
                </span>
              ) : null}
            </div>
          </>
        )}
      </header>

      {publisher.data ? <PublisherStats data={publisher.data} /> : null}

      <section className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Releases
          </h2>
          {publisher.data?.names ? (
            <p className="text-[12px] text-muted-foreground">
              <span className="font-mono tabular text-foreground">
                {publisher.data.names.length}
              </span>{' '}
              name{publisher.data.names.length === 1 ? '' : 's'} claimed
            </p>
          ) : null}
        </div>
        <ReleaseListHeader />
        {releases.isLoading ? (
          <ReleaseListSkeleton rows={6} />
        ) : releases.isError ? (
          <ErrorView
            title="Could not load releases"
            message={api_error_message(releases.error)}
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

function PublisherHeaderSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="h-7 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="flex gap-2">
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted/70" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted/70" />
      </div>
    </div>
  );
}

function PublisherStats({ data }: { data: NonNullable<ReturnType<typeof usePublisher>['data']> }) {
  const names = data.names ?? [];
  return (
    <section className="grid gap-3 border-y border-border py-5 sm:grid-cols-2">
      <div className="grid gap-1 px-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Claimed names
        </p>
        <p className="font-mono text-[18px] tabular text-foreground">
          {names.length}
        </p>
        {names.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {names.slice(0, 8).map((n) => (
              <li
                key={n.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-mono text-[11px] tabular text-foreground-soft"
              >
                <Hash className="size-2.5" strokeWidth={1.85} aria-hidden />
                {n.name}
              </li>
            ))}
            {names.length > 8 ? (
              <li className="inline-flex items-center px-1 font-mono text-[11px] tabular text-muted-foreground">
                +{names.length - 8} more
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
      <div className="grid gap-1 px-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Identity
        </p>
        <p className="font-mono text-[12px] tabular text-foreground-soft">
          {shorten(data.address, 8, 8)}
        </p>
        <p className="text-[12px] leading-snug text-muted-foreground">
          A publisher is a Solana keypair. Identity is the public key — there
          is no profile, only signed releases.
        </p>
        <Layers
          className="hidden size-3 text-muted-foreground"
          strokeWidth={1.85}
          aria-hidden
        />
      </div>
    </section>
  );
}

function EmptyReleases() {
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="text-[13.5px] text-foreground">No releases yet.</p>
      <p className="max-w-[40ch] text-[12px] leading-relaxed text-muted-foreground">
        This publisher is registered but has not signed a release.
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
        'inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground active:translate-y-px',
      )}
    >
      {copied ? (
        <Check className="size-3 text-accent" strokeWidth={2.4} aria-hidden />
      ) : (
        <Copy className="size-3" strokeWidth={1.85} aria-hidden />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
