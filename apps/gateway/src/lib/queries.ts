import {
  keepPreviousData,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { api } from '@/lib/api';

export type Sha256Hash = `sha256:${string}`;

export interface PublisherDto {
  id: string;
  created_at: string;
  updated_at: string;
  address: string;
  names?: NameDto[];
  releases?: ReleaseDto[];
}

export interface NameDto {
  id: string;
  created_at: string;
  updated_at: string;
  publisher_id: string;
  address: string;
  name: string;
  publisher?: PublisherDto | null;
  releases?: ReleaseDto[];
}

export interface ManifestDto {
  id: string;
  created_at: string;
  updated_at: string;
  release_id: string;
  uri: string;
  hash: Sha256Hash;
  release?: ReleaseDto | null;
}

export interface ReleaseDto {
  id: string;
  created_at: string;
  updated_at: string;
  publisher_id: string;
  name_id: string;
  address: string;
  version: string;
  schema_version: number;
  content_hash: Sha256Hash;
  content_size_bytes: number;
  signature: string;
  published_at: string;
  publisher?: PublisherDto | null;
  name?: NameDto | null;
  manifest?: ManifestDto | null;
}

export interface IndexerHealth {
  status: 'ok';
  backfill_completed_at: string | null;
  cursor_slot: number | null;
  cursor_signature: string | null;
  chain_slot: number | null;
  lag_slots: number | null;
}

export interface IndexerStats {
  releases: number;
  names: number;
  publishers: number;
}

const STALE_FEED = 30_000;
const STALE_LOOKUP = 60_000;
const STALE_HEALTH = 15_000;

export const query_keys = {
  feed: (input: { limit: number; offset: number; includes?: string }) =>
    ['indexer', 'feed', input] as const,
  search: (input: {
    q: string;
    limit: number;
    offset: number;
    includes?: string;
  }) => ['indexer', 'search', input] as const,
  name: (name: string, includes?: string) =>
    ['indexer', 'name', name, includes ?? null] as const,
  name_latest: (name: string, includes?: string) =>
    ['indexer', 'name', name, 'latest', includes ?? null] as const,
  name_versions: (
    name: string,
    input: { limit: number; offset: number; includes?: string },
  ) => ['indexer', 'name', name, 'versions', input] as const,
  publisher: (address: string, includes?: string) =>
    ['indexer', 'publisher', address, includes ?? null] as const,
  publisher_releases: (
    address: string,
    input: { limit: number; offset: number; includes?: string },
  ) => ['indexer', 'publisher', address, 'releases', input] as const,
  health: () => ['indexer', 'health'] as const,
  stats: () => ['indexer', 'stats'] as const,
};

function build_params(record: Record<string, string | number | undefined>) {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v !== undefined && v !== '') params[k] = v;
  }
  return params;
}

export function useFeed(
  input: { limit?: number; offset?: number; includes?: string } = {},
) {
  const { limit = 20, offset = 0, includes = 'publisher,name' } = input;
  return useQuery({
    queryKey: query_keys.feed({ limit, offset, includes }),
    queryFn: async () => {
      const { data } = await api.get<ReleaseDto[]>('/feed', {
        params: build_params({ limit, offset, includes }),
      });
      return data;
    },
    staleTime: STALE_FEED,
    placeholderData: keepPreviousData,
  });
}

export function useNameSearch(
  input: {
    q: string;
    limit?: number;
    offset?: number;
    includes?: string;
  },
  options?: Pick<UseQueryOptions<NameDto[]>, 'enabled'>,
) {
  const { q, limit = 8, offset = 0, includes } = input;
  const trimmed = q.trim();

  return useQuery<NameDto[]>({
    queryKey: query_keys.search({ q: trimmed, limit, offset, includes }),
    queryFn: async () => {
      const { data } = await api.get<NameDto[]>('/search', {
        params: build_params({ q: trimmed, limit, offset, includes }),
      });
      return data;
    },
    enabled: (options?.enabled ?? true) && trimmed.length > 0,
    staleTime: STALE_LOOKUP,
    placeholderData: keepPreviousData,
  });
}

export function useName(name: string | undefined, includes?: string) {
  return useQuery<NameDto>({
    queryKey: query_keys.name(name ?? '', includes),
    queryFn: async () => {
      const { data } = await api.get<NameDto>(
        `/names/${encodeURIComponent(name!)}`,
        { params: build_params({ includes }) },
      );
      return data;
    },
    enabled: Boolean(name),
    staleTime: STALE_LOOKUP,
  });
}

export function useNameLatest(name: string | undefined, includes?: string) {
  return useQuery<ReleaseDto>({
    queryKey: query_keys.name_latest(name ?? '', includes),
    queryFn: async () => {
      const { data } = await api.get<ReleaseDto>(
        `/names/${encodeURIComponent(name!)}/latest`,
        { params: build_params({ includes }) },
      );
      return data;
    },
    enabled: Boolean(name),
    staleTime: STALE_LOOKUP,
  });
}

export function useNameVersions(
  name: string | undefined,
  input: { limit?: number; offset?: number; includes?: string } = {},
) {
  const { limit = 50, offset = 0, includes } = input;
  return useQuery<ReleaseDto[]>({
    queryKey: query_keys.name_versions(name ?? '', { limit, offset, includes }),
    queryFn: async () => {
      const { data } = await api.get<ReleaseDto[]>(
        `/names/${encodeURIComponent(name!)}/versions`,
        { params: build_params({ limit, offset, includes }) },
      );
      return data;
    },
    enabled: Boolean(name),
    staleTime: STALE_LOOKUP,
    placeholderData: keepPreviousData,
  });
}

export function usePublisher(address: string | undefined, includes?: string) {
  return useQuery<PublisherDto>({
    queryKey: query_keys.publisher(address ?? '', includes),
    queryFn: async () => {
      const { data } = await api.get<PublisherDto>(
        `/publishers/${encodeURIComponent(address!)}`,
        { params: build_params({ includes }) },
      );
      return data;
    },
    enabled: Boolean(address),
    staleTime: STALE_LOOKUP,
  });
}

export function usePublisherReleases(
  address: string | undefined,
  input: { limit?: number; offset?: number; includes?: string } = {},
) {
  const { limit = 25, offset = 0, includes = 'name' } = input;
  return useQuery<ReleaseDto[]>({
    queryKey: query_keys.publisher_releases(address ?? '', {
      limit,
      offset,
      includes,
    }),
    queryFn: async () => {
      const { data } = await api.get<ReleaseDto[]>(
        `/publishers/${encodeURIComponent(address!)}/releases`,
        { params: build_params({ limit, offset, includes }) },
      );
      return data;
    },
    enabled: Boolean(address),
    staleTime: STALE_LOOKUP,
    placeholderData: keepPreviousData,
  });
}

export function useIndexerHealth() {
  return useQuery<IndexerHealth>({
    queryKey: query_keys.health(),
    queryFn: async () => {
      const { data } = await api.get<IndexerHealth>('/health');
      return data;
    },
    staleTime: STALE_HEALTH,
    refetchInterval: STALE_HEALTH,
    retry: 0,
  });
}

export function useIndexerStats() {
  return useQuery<IndexerStats>({
    queryKey: query_keys.stats(),
    queryFn: async () => {
      const { data } = await api.get<IndexerStats>('/stats');
      return data;
    },
    staleTime: STALE_FEED,
    refetchInterval: STALE_FEED,
    retry: 0,
  });
}
