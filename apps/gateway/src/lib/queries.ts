import {
  keepPreviousData,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

export type Sha256Hash = `sha256:${string}`;

export interface PublisherDto {
  id: string;
  created_at: string;
  updated_at: string;
  address: string;
  publications?: PublicationDto[];
  releases?: ReleaseDto[];
}

export interface PublicationDto {
  id: string;
  created_at: string;
  updated_at: string;
  publisher_id: string;
  address: string;
  registry_id: string;
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
  publication_id: string;
  address: string;
  version: string;
  schema_version: number;
  content_hash: Sha256Hash;
  content_size_bytes: number;
  signature: string;
  published_at: string;
  publisher?: PublisherDto | null;
  publication?: PublicationDto | null;
  manifest?: ManifestDto | null;
}

export interface ApiHealth {
  status: 'ok';
}

export interface IndexerStats {
  releases: number;
  publications: number;
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
  publication_versions: (
    registry_id: string,
    input: { limit: number; offset: number; includes?: string },
  ) => ['indexer', 'publication', registry_id, 'versions', input] as const,
  publisher: (address: string, includes?: string) =>
    ['indexer', 'publisher', address, includes ?? null] as const,
  publisher_releases: (
    address: string,
    input: { limit: number; offset: number; includes?: string },
  ) => ['indexer', 'publisher', address, 'releases', input] as const,
  api_health: () => ['api', 'health'] as const,
  stats: () => ['api', 'stats'] as const,
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
  const { limit = 20, offset = 0, includes = 'publisher,publication' } = input;
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

export function usePublicationSearch(
  input: {
    q: string;
    limit?: number;
    offset?: number;
    includes?: string;
  },
  options?: Pick<UseQueryOptions<PublicationDto[]>, 'enabled'>,
) {
  const { q, limit = 8, offset = 0, includes } = input;
  const trimmed = q.trim();

  return useQuery<PublicationDto[]>({
    queryKey: query_keys.search({ q: trimmed, limit, offset, includes }),
    queryFn: async () => {
      const { data } = await api.get<PublicationDto[]>('/search', {
        params: build_params({ q: trimmed, limit, offset, includes }),
      });
      return data;
    },
    enabled: (options?.enabled ?? true) && trimmed.length > 0,
    staleTime: STALE_LOOKUP,
    placeholderData: keepPreviousData,
  });
}

export function usePublicationVersions(
  registry_id: string | undefined,
  input: { limit?: number; offset?: number; includes?: string } = {},
) {
  const { limit = 50, offset = 0, includes } = input;
  return useQuery<ReleaseDto[]>({
    queryKey: query_keys.publication_versions(registry_id ?? '', {
      limit,
      offset,
      includes,
    }),
    queryFn: async () => {
      const { data } = await api.get<ReleaseDto[]>(
        `/publications/${encodeURIComponent(registry_id!)}/versions`,
        { params: build_params({ limit, offset, includes }) },
      );
      return data;
    },
    enabled: Boolean(registry_id),
    staleTime: STALE_LOOKUP,
    placeholderData: keepPreviousData,
  });
}

export function usePublisher(address: string | undefined, includes?: string) {
  return useQuery<PublisherDto | null>({
    queryKey: query_keys.publisher(address ?? '', includes),
    queryFn: async () => {
      try {
        const { data } = await api.get<PublisherDto>(
          `/publishers/${encodeURIComponent(address!)}`,
          { params: build_params({ includes }) },
        );
        return data;
      } catch (error) {
        const status = (error as ApiError).response?.status;
        if (status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(address),
    staleTime: STALE_LOOKUP,
  });
}

export function usePublisherReleases(
  address: string | undefined,
  input: { limit?: number; offset?: number; includes?: string } = {},
) {
  const { limit = 25, offset = 0, includes = 'publication' } = input;
  return useQuery<ReleaseDto[]>({
    queryKey: query_keys.publisher_releases(address ?? '', {
      limit,
      offset,
      includes,
    }),
    queryFn: async () => {
      try {
        const { data } = await api.get<ReleaseDto[]>(
          `/publishers/${encodeURIComponent(address!)}/releases`,
          { params: build_params({ limit, offset, includes }) },
        );
        return data;
      } catch (error) {
        const status = (error as ApiError).response?.status;
        if (status === 404) return [];
        throw error;
      }
    },
    enabled: Boolean(address),
    staleTime: STALE_LOOKUP,
    placeholderData: keepPreviousData,
  });
}

export function useApiHealth() {
  return useQuery<ApiHealth>({
    queryKey: query_keys.api_health(),
    queryFn: async () => {
      const { data } = await api.get<ApiHealth>('/health');
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
