import { useEffect, useState } from 'react';

import { env } from '@/env';
import { load_file_bytes } from '@/lib/verify';
import type { VerifiedFile } from '@/lib/types';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; bytes: Uint8Array }
  | { status: 'error'; error: string };

const IDLE: State = { status: 'idle' };

const verified_cache = new Map<string, Uint8Array>();
const inflight = new Map<string, Promise<Uint8Array>>();

function cache_key_for(file: VerifiedFile | undefined): string | undefined {
  return file ? `${file.uri}|${file.hash}` : undefined;
}

function read_cached(file: VerifiedFile | undefined): Uint8Array | undefined {
  const key = cache_key_for(file);

  return key ? verified_cache.get(key) : undefined;
}

function fetch_and_cache(key: string, file: VerifiedFile): Promise<Uint8Array> {
  const cached = verified_cache.get(key);

  if (cached) {
    return Promise.resolve(cached);
  }

  const existing = inflight.get(key);

  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const bytes = await load_file_bytes({
        uri: file.uri,
        expected_hash: file.hash,
        expected_size_bytes: file.size_bytes,
        ctx: {
          rpc_url: env.VITE_GUTENBERG_SOLANA_RPC_URL,
          irys_gateway: env.VITE_GUTENBERG_IRYS_GATEWAY,
          arweave_mirrors: env.VITE_GUTENBERG_ARWEAVE_MIRRORS,
          program_id: env.VITE_GUTENBERG_REGISTRY_PROGRAM_ID,
        },
      });

      verified_cache.set(key, bytes);

      return bytes;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);

  return promise;
}

export function prefetch_verified_file(file: VerifiedFile): void {
  const key = cache_key_for(file);

  if (!key || verified_cache.has(key)) {
    return;
  }

  void fetch_and_cache(key, file).catch(() => {
    // prefetch errors are silent; the main load hook will surface them if the
    // user actually navigates to this file.
  });
}

export function useVerifiedFile(
  path: `/${string}` | undefined,
  file: VerifiedFile | undefined,
): State {
  const cache_key = cache_key_for(file) ?? '';

  const compute_state = (): State => {
    if (!path || !file) {
      return IDLE;
    }

    const cached = read_cached(file);

    return cached
      ? { status: 'success', bytes: cached }
      : { status: 'loading' };
  };

  const [last_key, set_last_key] = useState(cache_key);
  const [state, set_state] = useState<State>(compute_state);

  if (last_key !== cache_key) {
    set_last_key(cache_key);
    set_state(compute_state());
  }

  useEffect(() => {
    if (!path || !file) {
      return;
    }

    let cancelled = false;

    fetch_and_cache(cache_key, file)
      .then((bytes) => {
        if (cancelled) return;
        set_state({ status: 'success', bytes });
      })
      .catch((err) => {
        if (cancelled) return;
        set_state({
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key composes uri + hash; intentionally narrow deps
  }, [cache_key]);

  return state;
}
