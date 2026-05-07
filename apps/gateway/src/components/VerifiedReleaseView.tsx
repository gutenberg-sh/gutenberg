import { useEffect, useMemo } from 'react';
import { FileCode2, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AssetView } from '@/components/AssetView';
import { ErrorView } from '@/components/ErrorView';
import { FileNav } from '@/components/FileNav';
import { GatewayLinks } from '@/components/GatewayLinks';
import { Container } from '@/components/Layout';
import { PublisherAddressLink } from '@/components/PublisherAddressLink';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ProvenancePanel, ReleaseHeader } from '@/components/ReleaseHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifyStatus } from '@/components/VerifyStatus';
import { env } from '@/env';
import { shorten } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useReferencedAssets } from '@/hooks/useReferencedAssets';
import {
  prefetch_verified_file,
  useVerifiedFile,
} from '@/hooks/useVerifiedFile';
import {
  useVerifiedRelease,
  type ReleaseSource,
} from '@/hooks/useVerifiedRelease';
import type { GutenbergManifest, VerifiedRelease } from '@/lib/types';

export function VerifiedReleaseView({
  source,
  base_path,
  current_path,
}: {
  source: ReleaseSource;
  base_path: string;
  current_path?: `/${string}`;
}) {
  const state = useVerifiedRelease(source);

  if (state.status === 'loading') {
    return (
      <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
        <ReleaseHeaderSkeleton />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_18.5rem] xl:gap-14">
          <div className="min-w-0">
            <VerifyStatus steps={state.steps} />
          </div>
          <aside className="grid gap-6 lg:sticky lg:top-24 lg:self-start">
            <PublicationAsideSkeleton />
            <FileNavSkeleton />
          </aside>
        </div>
        <ProvenancePanelSkeleton />
      </Container>
    );
  }

  if (state.status === 'error' || !state.result) {
    return (
      <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
        <VerifyStatus steps={state.steps} />
        <div>
          <ErrorView
            title="This publication didn't verify"
            message={
              state.error ??
              'Something went wrong while checking this publication.'
            }
            extras={
              state.partial_manifest_uri ? (
                <GatewayLinks
                  uri={state.partial_manifest_uri}
                  irys_gateway={env.VITE_GUTENBERG_IRYS_GATEWAY}
                  arweave_mirrors={env.VITE_GUTENBERG_ARWEAVE_MIRRORS}
                />
              ) : undefined
            }
          />
        </div>
      </Container>
    );
  }

  return (
    <VerifiedReleaseRendered
      release={state.result}
      base_path={base_path}
      current_path={current_path}
    />
  );
}

function ProvenancePanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border-t border-border pt-6 lg:pt-8', className)}>
      <div className="grid w-full gap-4">
        <header className="grid w-full max-w-[65ch] gap-1.5 text-left">
          <Skeleton className="h-[0.95rem] w-28 rounded-lg" />
          <Skeleton className="h-3 w-full max-w-sm rounded-lg" />
        </header>
        <div className="rounded-lg border border-border/90 bg-surface/45 p-3 shadow-[inset_0_1px_0_oklch(1_0_0/5%)] sm:p-4 lg:p-5 dark:bg-surface/35 dark:shadow-[inset_0_1px_0_oklch(1_0_0/6%)]">
          <div className="grid w-full gap-5">
            <div className="grid min-w-0 gap-2">
              <div className="grid gap-1 border-b border-border/50 pb-2">
                <Skeleton className="h-3 w-20 rounded-lg" />
                <Skeleton className="h-2.5 w-32 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="grid min-w-0 gap-2 border-t border-border/45 pt-5">
              <div className="grid gap-1 border-b border-border/50 pb-2">
                <Skeleton className="h-3 w-36 rounded-lg" />
                <Skeleton className="h-2.5 w-44 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="grid min-w-0 gap-2 border-t border-border/45 pt-5">
              <div className="grid gap-1 border-b border-border/50 pb-2">
                <Skeleton className="h-3 w-20 rounded-lg" />
                <Skeleton className="h-2.5 w-48 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/40 pt-2">
                <Skeleton className="h-3 w-28 rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReleaseHeaderSkeleton() {
  return (
    <header className="grid gap-3" aria-hidden>
      <Skeleton className="h-3 w-24 rounded-lg" />

      <div className="grid gap-4">
        <div className="flex min-h-13 flex-wrap items-baseline gap-x-2.5 gap-y-2 sm:min-h-[3.85rem] lg:min-h-[4.35rem]">
          <Skeleton className="h-9 w-full max-w-[min(100%,22rem)] rounded-lg sm:h-11 sm:max-w-[min(100%,28rem)]" />
          <Skeleton className="h-7 w-16 rounded-lg sm:h-7 sm:w-[4.5rem]" />
          <Skeleton className="h-3 w-18 rounded-lg sm:ml-1" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        <Skeleton className="h-[30px] w-19 rounded-lg" />
        <Skeleton className="h-[30px] w-26 rounded-lg" />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Skeleton className="h-[13px] w-30 rounded-lg" />
        <Skeleton className="h-[13px] w-22 rounded-lg" />
        <Skeleton className="h-[13px] w-24 rounded-lg" />
      </div>
    </header>
  );
}

function PublicationAsideSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/6%)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/8%)]">
      <Skeleton className="h-2.5 w-34 rounded-lg" />
      <dl className="mt-4 grid gap-4 text-[13px]">
        <div className="grid gap-1">
          <Skeleton className="h-2.5 w-24 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
        <div className="grid gap-1">
          <Skeleton className="h-2.5 w-16 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-48 rounded-lg" />
        </div>
        <div className="grid gap-1">
          <Skeleton className="h-2.5 w-30 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded-lg" />
        </div>
        <div className="border-t border-border pt-4">
          <Skeleton className="h-4 w-36 rounded-lg" />
        </div>
      </dl>
    </div>
  );
}

function FileNavSkeleton() {
  return (
    <nav
      aria-hidden
      className="grid gap-6 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
    >
      {[0, 1].map((section) => (
        <div key={section} className="grid gap-0">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <Skeleton className="h-2.5 w-24 rounded-lg" />
            <Skeleton className="h-3 w-6 rounded-lg" />
          </div>
          <ul className="grid">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="border-t border-border/60 last:border-b last:border-border/60"
              >
                <div className="py-2.5">
                  <Skeleton className="h-[13px] w-full max-w-44 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function VerifiedReleaseRendered({
  release,
  base_path,
  current_path,
}: {
  release: VerifiedRelease;
  base_path: string;
  current_path?: `/${string}`;
}) {
  const manifest = release.manifest;
  const target_path: `/${string}` =
    current_path && release.files.has(current_path)
      ? current_path
      : manifest.entry;
  const target_file = release.files.get(target_path);

  const page_paths = useMemo(
    () =>
      Object.keys(manifest.files)
        .filter((path) => path.toLowerCase().endsWith('.md'))
        .sort() as Array<`/${string}`>,
    [manifest.files],
  );

  const asset_paths = useMemo(
    () =>
      Object.keys(manifest.files)
        .filter((path) => !path.toLowerCase().endsWith('.md'))
        .sort() as Array<`/${string}`>,
    [manifest.files],
  );

  useEffect(() => {
    const handle = schedule_idle(() => {
      for (const path of page_paths) {
        if (path === target_path) continue;
        const file = release.files.get(path);
        if (file) prefetch_verified_file(file);
      }
    });

    return () => cancel_idle(handle);
  }, [page_paths, release.files, target_path]);

  if (!target_file) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="File not in this publication"
          message={`This publication doesn't include ${target_path}. Pick a file from the index, or open the entry page.`}
          back_to={base_path}
        />
      </Container>
    );
  }

  return (
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <ReleaseHeader release={release} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_18.5rem] xl:gap-14">
        <div className="min-w-0">
          <ActiveFile
            release={release}
            target_path={target_path}
            base_path={base_path}
          />
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-24 lg:self-start">
          <PublicationAside
            release={release}
            page_count={page_paths.length}
            asset_count={asset_paths.length}
          />

          <FileNav
            pages={page_paths}
            assets={asset_paths}
            base_path={base_path}
            current_path={target_path}
            entry_path={manifest.entry}
          />
        </aside>
      </div>

      <ProvenancePanel release={release} />
    </Container>
  );
}

function PublicationAside({
  release,
  page_count,
  asset_count,
}: {
  release: VerifiedRelease;
  page_count: number;
  asset_count: number;
}) {
  const m = release.manifest;
  const publisher = m.publisher;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/6%)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/8%)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Publication details
      </p>
      <dl className="mt-4 grid gap-4 text-[13px]">
        <div className="grid gap-1">
          <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Publisher
          </dt>
          <dd>
            <PublisherAddressLink
              address={publisher}
              avatarSize={26}
              className="font-mono text-[12.5px] tabular text-foreground underline-offset-4 hover:underline"
            >
              {shorten(publisher, 6, 6)}
            </PublisherAddressLink>
          </dd>
        </div>

        <div className="grid gap-1">
          <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Entry
          </dt>
          <dd className="flex items-start gap-1.5 font-mono text-[12px] tabular text-foreground-soft">
            <FileCode2
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="break-all">{m.entry}</span>
          </dd>
        </div>

        <div className="grid gap-1">
          <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Pages
          </dt>
          <dd className="font-mono text-[12px] tabular text-foreground-soft">
            {page_count} markdown file{page_count === 1 ? '' : 's'}
          </dd>
        </div>

        <div className="grid gap-1">
          <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Assets
          </dt>
          <dd className="font-mono text-[12px] tabular text-foreground-soft">
            {asset_count === 0
              ? 'None'
              : `${asset_count} file${asset_count === 1 ? '' : 's'}`}
          </dd>
        </div>

        <div className="border-t border-border pt-4">
          <Link
            to={`/publication/${encodeURIComponent(m.registry_id)}/versions`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-foreground underline-offset-4 hover:underline"
          >
            <GitBranch
              className="size-3.5 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            View all versions
          </Link>
        </div>
      </dl>
    </div>
  );
}

function ActiveFile({
  release,
  target_path,
  base_path,
}: {
  release: VerifiedRelease;
  target_path: `/${string}`;
  base_path: string;
}) {
  const target_file = release.files.get(target_path)!;
  const file_state = useVerifiedFile(target_path, target_file);
  const ext = extension_of(target_path);

  if (file_state.status === 'idle' || file_state.status === 'loading') {
    return <FileLoadingSkeleton path={target_path} />;
  }

  if (file_state.status === 'error') {
    return (
      <ErrorView
        title="This file didn't verify"
        message={file_state.error}
        back_to={base_path}
        extras={
          <GatewayLinks
            uri={target_file.uri}
            irys_gateway={env.VITE_GUTENBERG_IRYS_GATEWAY}
            arweave_mirrors={env.VITE_GUTENBERG_ARWEAVE_MIRRORS}
          />
        }
      />
    );
  }

  if (ext === '.md') {
    return (
      <ActiveMarkdown
        release={release}
        target_path={target_path}
        bytes={file_state.bytes}
        base_path={base_path}
      />
    );
  }

  return <AssetView path={target_path} bytes={file_state.bytes} />;
}

function ActiveMarkdown({
  release,
  target_path,
  bytes,
  base_path,
}: {
  release: VerifiedRelease;
  target_path: `/${string}`;
  bytes: Uint8Array;
  base_path: string;
}) {
  const source = useMemo(() => new TextDecoder('utf-8').decode(bytes), [bytes]);

  const asset_state = useReferencedAssets({
    source,
    current_path: target_path,
    files: release.files,
  });

  if (asset_state.status === 'idle' || asset_state.status === 'loading') {
    return <FileLoadingSkeleton path={target_path} />;
  }

  if (asset_state.status === 'error') {
    return (
      <ErrorView
        title="A linked file didn't verify"
        message={asset_state.error}
        back_to={base_path}
      />
    );
  }

  return (
    <div className="grid gap-3">
      <MarkdownContent
        source={source}
        resolve_url={(raw) =>
          resolve_relative_url({
            raw,
            current_path: target_path,
            manifest: release.manifest,
            base_path,
            assets: asset_state.assets,
            files: release.files,
          })
        }
      />
    </div>
  );
}

function FileLoadingSkeleton({ path }: { path: string }) {
  return (
    <div className="grid gap-3" aria-busy aria-live="polite">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Checking {path}
      </p>
      <div className="grid gap-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
      </div>
    </div>
  );
}

function extension_of(path: `/${string}`): string {
  const idx = path.lastIndexOf('.');

  return idx >= 0 ? path.slice(idx).toLowerCase() : '';
}

type IdleHandle =
  | { kind: 'idle'; id: number }
  | { kind: 'timeout'; id: number };

function schedule_idle(cb: () => void): IdleHandle {
  if (typeof window.requestIdleCallback === 'function') {
    return {
      kind: 'idle',
      id: window.requestIdleCallback(cb, { timeout: 2000 }),
    };
  }

  return { kind: 'timeout', id: window.setTimeout(cb, 200) };
}

function cancel_idle(handle: IdleHandle): void {
  if (
    handle.kind === 'idle' &&
    typeof window.cancelIdleCallback === 'function'
  ) {
    window.cancelIdleCallback(handle.id);
    return;
  }

  window.clearTimeout(handle.id);
}

function resolve_relative_url(input: {
  raw: string;
  current_path: `/${string}`;
  manifest: GutenbergManifest;
  base_path: string;
  assets: ReadonlyMap<`/${string}`, string>;
  files: VerifiedRelease['files'];
}): string | undefined {
  const { raw, current_path, base_path, files, assets } = input;

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    raw.startsWith('#') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  const resolved_release_path = resolve_within_release(current_path, raw);

  if (!resolved_release_path) {
    return undefined;
  }

  if (!files.has(resolved_release_path)) {
    return undefined;
  }

  const ext = extension_of(resolved_release_path);

  if (ext === '.md') {
    return `${base_path}${encode_release_path(resolved_release_path)}`;
  }

  return assets.get(resolved_release_path);
}

function resolve_within_release(
  current: `/${string}`,
  raw: string,
): `/${string}` | undefined {
  const cleaned = raw.split('?')[0]?.split('#')[0] ?? raw;

  if (!cleaned || cleaned.length === 0) {
    return current;
  }

  if (cleaned.startsWith('/')) {
    return normalize_release_path(cleaned);
  }

  const last_slash = current.lastIndexOf('/');
  const dir = last_slash >= 0 ? current.slice(0, last_slash) : '';

  return normalize_release_path(`${dir}/${cleaned}`);
}

function normalize_release_path(path: string): `/${string}` | undefined {
  const segments: string[] = [];

  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (segments.length === 0) {
        return undefined;
      }

      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return `/${segments.join('/')}`;
}

function encode_release_path(path: `/${string}`): string {
  return path
    .split('/')
    .map((segment) => (segment ? encodeURIComponent(segment) : ''))
    .join('/');
}
