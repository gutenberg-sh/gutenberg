import { useMemo } from 'react';

import { AssetView } from '@/components/AssetView';
import { ErrorView } from '@/components/ErrorView';
import { FileNav } from '@/components/FileNav';
import { GatewayLinks } from '@/components/GatewayLinks';
import { Container } from '@/components/Layout';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ReleaseHeader } from '@/components/ReleaseHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifyStatus } from '@/components/VerifyStatus';
import { env } from '@/env';
import { useReferencedAssets } from '@/hooks/useReferencedAssets';
import { useVerifiedFile } from '@/hooks/useVerifiedFile';
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
      <Container className="grid gap-12 pb-20 pt-12 lg:gap-16 lg:pb-28 lg:pt-16">
        <ReleaseHeaderSkeleton />
        <div className="grid gap-10 border-t border-border pt-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14 lg:pt-16">
          <div className="grid content-start gap-3">
            <Skeleton className="h-3 w-16" />
            <div className="grid gap-3 border-y border-border py-4">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
          <div className="min-w-0">
            <VerifyStatus steps={state.steps} />
          </div>
        </div>
      </Container>
    );
  }

  if (state.status === 'error' || !state.result) {
    return (
      <Container className="grid gap-12 pb-20 pt-12 lg:gap-16 lg:pb-28 lg:pt-16">
        <VerifyStatus steps={state.steps} />
        <div className="border-t border-border pt-12 lg:pt-16">
          <ErrorView
            title="Verification failed"
            message={state.error ?? 'Unknown error'}
            extras={
              state.partial_manifest_uri ? (
                <GatewayLinks
                  uri={state.partial_manifest_uri}
                  gateways={env.VITE_GUTENBERG_ARWEAVE_GATEWAYS}
                  label="Try the manifest via"
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

function ReleaseHeaderSkeleton() {
  return (
    <section className="grid gap-7">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="grid gap-2.5">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 border-y border-border py-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="grid gap-1.5 py-1.5 sm:px-3">
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
  const target_file = release.files.get(target_path);

  const all_paths = useMemo(
    () =>
      Object.keys(manifest.files)
        .filter((path) => path.endsWith('.md'))
        .sort() as Array<`/${string}`>,
    [manifest.files],
  );

  if (!target_file) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="File not found"
          message={`The release does not include ${target_path}.`}
          back_to={base_path}
        />
      </Container>
    );
  }

  return (
    <Container className="grid gap-12 pb-20 pt-12 lg:gap-16 lg:pb-28 lg:pt-16">
      <ReleaseHeader release={release} />

      <div className="grid gap-10 border-t border-border pt-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14 lg:pt-16">
        <FileNav
          files={all_paths}
          base_path={base_path}
          current_path={target_path}
        />

        <div className="min-w-0">
          <ActiveFile
            release={release}
            target_path={target_path}
            base_path={base_path}
          />
        </div>
      </div>
    </Container>
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
        title="File verification failed"
        message={file_state.error}
        back_to={base_path}
        extras={
          <GatewayLinks
            uri={target_file.uri}
            gateways={env.VITE_GUTENBERG_ARWEAVE_GATEWAYS}
            label="Try this file via"
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
  const source = useMemo(
    () => new TextDecoder('utf-8').decode(bytes),
    [bytes],
  );

  const asset_state = useReferencedAssets({
    source,
    current_path: target_path,
    files: release.files,
  });

  if (
    asset_state.status === 'idle' ||
    asset_state.status === 'loading'
  ) {
    return <FileLoadingSkeleton path={target_path} />;
  }

  if (asset_state.status === 'error') {
    return (
      <ErrorView
        title="Linked asset failed verification"
        message={asset_state.error}
        back_to={base_path}
      />
    );
  }

  return (
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
  );
}

function FileLoadingSkeleton({ path }: { path: string }) {
  return (
    <div className="grid gap-3" aria-busy aria-live="polite">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Verifying {path}
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

  const resolved_site_path = resolve_within_site(current_path, raw);

  if (!resolved_site_path) {
    return undefined;
  }

  if (!files.has(resolved_site_path)) {
    return undefined;
  }

  const ext = extension_of(resolved_site_path);

  if (ext === '.md') {
    return `${base_path}${encode_site_path(resolved_site_path)}`;
  }

  return assets.get(resolved_site_path);
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
