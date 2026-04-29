import type {
  ContentUri,
  Sha256Hash,
  SolanaPublicKey,
} from '../manifest/manifest.types';

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

export type ReleaseRegistryRepository = {
  assert_can_publish(): Promise<void>;
  publish_release(event: GutenbergReleaseEvent): Promise<void>;
  list_releases(): Promise<GutenbergReleaseEvent[]>;
  find_release(
    input: FindReleaseInput,
  ): Promise<GutenbergReleaseEvent | undefined>;
  has_release(input: HasReleaseInput): Promise<boolean>;
};
