import type {
  ContentUri,
  Sha256Hash,
  SolanaPublicKey,
} from '../../common/types/manifest.types';

export const release_event_type = 'gutenberg.release.v1' as const;

export type GutenbergReleaseEvent = {
  type: typeof release_event_type;
  schema_version: number;
  publisher: SolanaPublicKey;
  name: string;
  version: string;
  manifest: ContentUri;
  manifest_hash: Sha256Hash;
  content_hash: Sha256Hash;
  content_size_bytes: number;
  created_at: string;
  created_at_slot: number;
};

export type FindReleaseInput = {
  name: string;
  version?: string;
};

export type HasReleaseInput = {
  name: string;
  version: string;
};

export type ClaimNameInput = {
  name: string;
  publisher: SolanaPublicKey;
};
