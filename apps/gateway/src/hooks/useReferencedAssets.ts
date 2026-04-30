import { useEffect, useMemo, useState } from 'react';

import { env } from '@/env';
import type { VerifiedFile } from '@/lib/types';
import { load_file_bytes } from '@/lib/verify';

const URL_RE_MD_LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;
const URL_RE_HTML_SRC = /<\s*(?:img|source|video|audio)[^>]*\bsrc\s*=\s*"([^"]+)"/gi;

export type AssetMap = ReadonlyMap<`/${string}`, string>;

type State =
  | { status: 'idle' }
  | { status: 'loading'; loaded: number; total: number }
  | { status: 'success'; assets: AssetMap }
  | { status: 'error'; error: string; partial: AssetMap };

const IDLE: State = { status: 'idle' };
const EMPTY_SUCCESS: State = { status: 'success', assets: new Map() };

export function useReferencedAssets(input: {
  source: string | undefined;
  current_path: `/${string}` | undefined;
  files: ReadonlyMap<`/${string}`, VerifiedFile>;
}): State {
  const referenced_asset_paths = useMemo<readonly `/${string}`[]>(() => {
    if (!input.source || !input.current_path) {
      return [];
    }

    const refs = new Set<`/${string}`>();

    for (const raw of extract_url_refs(input.source)) {
      if (is_external_or_intra_doc(raw)) {
        continue;
      }

      const resolved = resolve_within_site(input.current_path, raw);

      if (!resolved) {
        continue;
      }

      if (!input.files.has(resolved)) {
        continue;
      }

      if (resolved.endsWith('.md')) {
        continue;
      }

      refs.add(resolved);
    }

    return [...refs];
  }, [input.source, input.current_path, input.files]);

  const cache_key = useMemo(
    () =>
      referenced_asset_paths
        .map((path) => `${path}@${input.files.get(path)?.uri ?? ''}`)
        .join('|'),
    [referenced_asset_paths, input.files],
  );

  const initial_state: State =
    input.source === undefined || !input.current_path
      ? IDLE
      : referenced_asset_paths.length === 0
        ? EMPTY_SUCCESS
        : { status: 'loading', loaded: 0, total: referenced_asset_paths.length };

  const [last_key, set_last_key] = useState(cache_key);
  const [state, set_state] = useState<State>(initial_state);

  if (last_key !== cache_key) {
    set_last_key(cache_key);
    if (input.source === undefined || !input.current_path) {
      set_state(IDLE);
    } else if (referenced_asset_paths.length === 0) {
      set_state(EMPTY_SUCCESS);
    } else {
      set_state({
        status: 'loading',
        loaded: 0,
        total: referenced_asset_paths.length,
      });
    }
  }

  useEffect(() => {
    if (input.source === undefined || !input.current_path) {
      return;
    }

    if (referenced_asset_paths.length === 0) {
      return;
    }

    let cancelled = false;
    const total = referenced_asset_paths.length;
    let loaded = 0;
    const loaded_assets = new Map<`/${string}`, string>();
    const blob_urls: string[] = [];

    void (async () => {
      try {
        await Promise.all(
          referenced_asset_paths.map(async (path) => {
            const file = input.files.get(path)!;
            const bytes = await load_file_bytes({
              uri: file.uri,
              expected_hash: file.hash,
              expected_size_bytes: file.size_bytes,
              ctx: {
                rpc_url: env.VITE_GUTENBERG_SOLANA_RPC_URL,
                arweave_gateways: env.VITE_GUTENBERG_ARWEAVE_GATEWAYS,
                program_id: env.VITE_GUTENBERG_REGISTRY_PROGRAM_ID,
              },
            });

            if (cancelled) return;

            const blob = new Blob(
              [
                bytes.buffer.slice(
                  bytes.byteOffset,
                  bytes.byteOffset + bytes.byteLength,
                ) as ArrayBuffer,
              ],
              { type: file.mime ?? mime_for_ext(extension_of(path)) },
            );
            const url = URL.createObjectURL(blob);
            blob_urls.push(url);
            loaded_assets.set(path, url);

            loaded++;
            set_state({ status: 'loading', loaded, total });
          }),
        );

        if (cancelled) return;
        set_state({ status: 'success', assets: loaded_assets });
      } catch (err) {
        if (cancelled) return;
        set_state({
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          partial: loaded_assets,
        });
      }
    })();

    return () => {
      cancelled = true;
      for (const url of blob_urls) {
        URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- composed key
  }, [cache_key]);

  return state;
}

function extract_url_refs(source: string): string[] {
  const refs: string[] = [];

  for (const match of source.matchAll(URL_RE_MD_LINK)) {
    if (match[1]) refs.push(match[1]);
  }

  for (const match of source.matchAll(URL_RE_HTML_SRC)) {
    if (match[1]) refs.push(match[1]);
  }

  return refs;
}

function is_external_or_intra_doc(raw: string): boolean {
  return (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    raw.startsWith('#') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
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

function extension_of(path: string): string {
  const idx = path.lastIndexOf('.');

  return idx >= 0 ? path.slice(idx).toLowerCase() : '';
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
