import { REGISTRY_ID_RE } from '@gutenberg/core';
import { ArrowUpRight, GitBranch } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { PublisherAddressLink } from '@/components/PublisherAddressLink';
import { api_error_message } from '@/lib/api';
import { format_bytes, format_relative_time, shorten } from '@/lib/format';
import { usePublicationVersions, type ReleaseDto } from '@/lib/queries';

export function VersionsRoute() {
  const params = useParams();
  const registry_id = params.registry_id;

  if (!registry_id || !REGISTRY_ID_RE.test(registry_id)) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="That registry id doesn't look right"
          message={`"${registry_id ?? ''}" isn't a valid registry id. Use lowercase letters, numbers, dots, underscores, or hyphens.`}
        />
      </Container>
    );
  }

  return <VersionsView registry_id={registry_id} />;
}

function VersionsView({ registry_id }: { registry_id: string }) {
  const versions = usePublicationVersions(registry_id, {
    limit: 100,
    includes: 'publisher',
  });

  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Release history
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
            {registry_id}
          </h1>
          <Link
            to={`/publication/${encodeURIComponent(registry_id)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground"
          >
            Open latest release
            <ArrowUpRight className="size-3.5" strokeWidth={1.85} aria-hidden />
          </Link>
        </div>
        <p className="max-w-[60ch] text-[14.5px] leading-[1.7] text-foreground-soft">
          Every release this publisher has anchored for this registry id, newest
          first. Each release is permanent — once it&rsquo;s up, it stays up
          exactly as it was signed.
        </p>
      </header>

      {versions.isLoading ? (
        <Skeleton />
      ) : versions.isError ? (
        <ErrorView
          title="Couldn't load releases"
          message={api_error_message(
            versions.error,
            "We can't reach the indexer right now. Try again in a moment.",
          )}
        />
      ) : (versions.data?.length ?? 0) === 0 ? (
        <EmptyVersions />
      ) : (
        <Timeline registry_id={registry_id} versions={versions.data ?? []} />
      )}
    </Container>
  );
}

function Timeline({
  registry_id,
  versions,
}: {
  registry_id: string;
  versions: ReleaseDto[];
}) {
  return (
    <ol className="relative grid">
      <span
        aria-hidden
        className="absolute left-[5px] top-2 bottom-2 w-px bg-border"
      />
      {versions.map((release, idx) => {
        const is_latest = idx === 0;
        const publisher_address = release.publisher?.address;
        return (
          <li key={release.id} className="relative grid pl-7">
            <span
              aria-hidden
              className={
                is_latest
                  ? 'absolute left-0 top-6 inline-flex size-2.5 items-center justify-center rounded-lg bg-accent ring-4 ring-background'
                  : 'absolute left-0 top-6 inline-flex size-2.5 items-center justify-center rounded-lg bg-border ring-4 ring-background'
              }
            />
            <Link
              to={`/publication/${encodeURIComponent(registry_id)}/${encodeURIComponent(release.version)}`}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border py-4 transition-colors hover:bg-surface/40"
            >
              <div className="grid min-w-0 gap-1 px-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[14.5px] font-medium tabular text-foreground group-hover:underline">
                    {release.version}
                  </span>
                  {is_latest ? (
                    <span className="rounded-lg border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-accent">
                      Latest
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                  <span title={new Date(release.published_at).toISOString()}>
                    {format_relative_time(release.published_at)}
                  </span>
                  <span aria-hidden className="text-muted-foreground/50">
                    ·
                  </span>
                  <span>{format_bytes(release.content_size_bytes)}</span>
                  <span aria-hidden className="text-muted-foreground/50">
                    ·
                  </span>
                  {publisher_address ? (
                    <PublisherAddressLink
                      address={publisher_address}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono tabular text-foreground-soft hover:text-foreground hover:underline"
                    >
                      {shorten(publisher_address, 6, 6)}
                    </PublisherAddressLink>
                  ) : (
                    <span className="font-mono tabular text-muted-foreground">
                      —
                    </span>
                  )}
                </div>
              </div>
              <ArrowUpRight
                className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function Skeleton() {
  return (
    <div aria-busy aria-live="polite" className="grid gap-3 pl-7">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="grid gap-1 border-b border-border py-4">
          <div className="h-4 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-3 w-1/3 max-w-[14rem] animate-pulse rounded-lg bg-muted/70" />
        </div>
      ))}
    </div>
  );
}

function EmptyVersions() {
  return (
    <div className="grid place-items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <GitBranch
        className="size-5 text-muted-foreground"
        strokeWidth={1.6}
        aria-hidden
      />
      <p className="text-[14px] text-foreground">No releases yet.</p>
      <p className="max-w-[40ch] text-[12.5px] leading-[1.65] text-muted-foreground">
        Either this registry id doesn&apos;t exist, or it was just published and
        we&apos;re still catching up. Refresh in a moment.
      </p>
    </div>
  );
}
