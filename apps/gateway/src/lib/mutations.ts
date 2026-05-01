import { useMutation, useQueryClient } from '@tanstack/react-query';

import { query_keys } from '@/lib/queries';

/**
 * Forces a refresh of all live indexer feeds. Useful after the user
 * publishes a release locally — the indexer needs a moment to ingest
 * the new on-chain event, and we want the UI to reflect it as soon
 * as it appears.
 *
 * The publish flow itself is *not* a mutation against the indexer — it
 * is a wallet-signed Solana transaction handled by `run_publish_flow`.
 * Mutations live here for any future indexer write paths (e.g. opt-in
 * account profiles, follow/unfollow, etc.).
 */
export function useRefreshIndexerFeeds() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['indexer', 'feed'] }),
        qc.invalidateQueries({ queryKey: ['indexer', 'search'] }),
        qc.invalidateQueries({ queryKey: ['indexer', 'name'] }),
        qc.invalidateQueries({ queryKey: ['indexer', 'publisher'] }),
        qc.invalidateQueries({ queryKey: query_keys.health() }),
        qc.invalidateQueries({ queryKey: query_keys.stats() }),
      ]);
    },
  });
}
