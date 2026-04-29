import type {
  ContentUri,
  Sha256Hash,
  SolanaPublicKey,
} from '../manifest/manifest.types';

export const release_event_type = 'gutenberg.release.v0' as const;

export type GutenbergReleaseEventV0 = {
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

export type ReleaseRegistryRepository = {
  assert_can_publish(): Promise<void>;
  publish_release(event: GutenbergReleaseEventV0): Promise<void>;
  list_releases(): Promise<GutenbergReleaseEventV0[]>;
  find_release(
    input: FindReleaseInput,
  ): Promise<GutenbergReleaseEventV0 | undefined>;
  has_release(input: HasReleaseInput): Promise<boolean>;
};
