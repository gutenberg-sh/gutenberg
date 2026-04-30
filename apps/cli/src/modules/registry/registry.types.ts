import type {
  ContentUri,
  Sha256Hash,
  SolanaPublicKey,
} from '../../common/types/manifest.types';

export const release_event_type = 'gutenberg.release.v1' as const;

export type GutenbergReleaseEvent = {
  type: typeof release_event_type;
  name: string;
  version: string;
  manifest: ContentUri;
  manifest_hash: Sha256Hash;
  publisher: SolanaPublicKey;
  created_at: string;
};

export type FindReleaseInput = {
  name: string;
  version?: string;
  publisher?: SolanaPublicKey;
};

export type HasReleaseInput = {
  name: string;
  version: string;
  publisher: SolanaPublicKey;
};

export type ClaimNameInput = {
  name: string;
  publisher: SolanaPublicKey;
};

export type UnpublishInput = {
  name: string;
  version: string;
};

export type UnpublishBatchInput = {
  name: string;
  versions: string[];
};
