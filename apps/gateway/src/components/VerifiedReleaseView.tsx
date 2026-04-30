import { useMemo } from 'react';

import { AssetView } from '@/components/AssetView';
import { ErrorView } from '@/components/ErrorView';
import { FileNav } from '@/components/FileNav';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ReleaseHeader } from '@/components/ReleaseHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifyStatus } from '@/components/VerifyStatus';
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
      <div className="grid gap-10">
        <ReleaseHeaderSkeleton />
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
          <div className="grid gap-3">
            <Skeleton className="h-3 w-16" />
            <div className="grid gap-2 border-y border-border/70 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="grid gap-4">
            <VerifyStatus steps={state.steps} />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error' || !state.result) {
    return (
      <div className="grid gap-10">
        <section
          aria-label="Verification"
          className="grid gap-3 border-y border-border/70 py-6"
        >
          <VerifyStatus steps={state.steps} />
        </section>
        <ErrorView
          title="Verification failed"
          message={state.error ?? 'Unknown error'}
        />
      </div>
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

function ReleaseHeaderSkeleton() {
  return (
    <section className="grid gap-6 border-y border-border/70 py-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="grid gap-1.5 px-1 py-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full max-w-[280px]" />
          </div>
        ))}
      </div>
    </section>
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
  const target_bytes = release.files.get(target_path);

  const all_paths = useMemo(
    () =>
      Object.keys(manifest.files)
        .filter((path) => path.endsWith('.md'))
        .sort() as Array<`/${string}`>,
    [manifest.files],
  );

  if (!target_bytes) {
    return (
      <ErrorView
        title="File not found"
        message={`The release does not include ${target_path}.`}
        back_to={base_path}
      />
    );
  }

  const ext = extension_of(target_path);

  return (
    <div className="grid gap-10">
      <ReleaseHeader
        manifest={manifest}
        manifest_uri={release.manifest_uri}
        release_pda={release.release_pda}
      />

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <FileNav
          files={all_paths}
          base_path={base_path}
          current_path={target_path}
        />

        <div className="min-w-0">
          {ext === '.md' ? (
            <MarkdownContent
              source={new TextDecoder('utf-8').decode(target_bytes)}
              resolve_url={(raw) =>
                resolve_relative_url({
                  raw,
                  current_path: target_path,
                  manifest,
                  base_path,
                  release,
                })
              }
            />
          ) : (
            <AssetView path={target_path} bytes={target_bytes} />
          )}
        </div>
      </div>
    </div>
  );
}

function extension_of(path: `/${string}`): string {
  const idx = path.lastIndexOf('.');

  return idx >= 0 ? path.slice(idx).toLowerCase() : '';
}

function resolve_relative_url(input: {
  raw: string;
  current_path: `/${string}`;
  manifest: GutenbergManifest;
  base_path: string;
  release: VerifiedRelease;
}): string | undefined {
  const { raw, current_path, base_path, release } = input;

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    raw.startsWith('#')
  ) {
    return raw;
  }

  const resolved_site_path = resolve_within_site(current_path, raw);

  if (!resolved_site_path) {
    return undefined;
  }

  if (!release.files.has(resolved_site_path)) {
    return undefined;
  }

  const ext = extension_of(resolved_site_path);

  if (ext === '.md') {
    return `${base_path}${encode_site_path(resolved_site_path)}`;
  }

  const bytes = release.files.get(resolved_site_path);

  if (!bytes) {
    return undefined;
  }

  return URL.createObjectURL(
    new Blob(
      [
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      ],
      { type: mime_for_ext(ext) },
    ),
  );
}

function resolve_within_site(
  current: `/${string}`,
  raw: string,
): `/${string}` | undefined {
  const cleaned = raw.split('?')[0]?.split('#')[0] ?? raw;

  if (!cleaned || cleaned.length === 0) {
    return current;
  }

  if (cleaned.startsWith('/')) {
    return normalize_site_path(cleaned);
  }

  const last_slash = current.lastIndexOf('/');
  const dir = last_slash >= 0 ? current.slice(0, last_slash) : '';

  return normalize_site_path(`${dir}/${cleaned}`);
}

function normalize_site_path(path: string): `/${string}` | undefined {
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

function encode_site_path(path: `/${string}`): string {
  return path
    .split('/')
    .map((segment) => (segment ? encodeURIComponent(segment) : ''))
    .join('/');
}

function mime_for_ext(ext: string): string {
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.json':
      return 'application/json';
    case '.css':
      return 'text/css';
    case '.html':
      return 'text/html';
    case '.txt':
    case '.md':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}
