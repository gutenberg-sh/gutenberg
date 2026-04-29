import type {
  ContentUri,
  Ed25519Signature,
  SolanaPublicKey,
} from '../manifest/manifest.types';

export const release_event_type = 'veritas.release.v0' as const;

export type VeritasUnsignedReleaseEventV0 = {
  type: typeof release_event_type;
  name: string;
  version: string;
  manifest: ContentUri;
  publisher: SolanaPublicKey;
  created_at: string;
};

export type VeritasReleaseEventV0 = VeritasUnsignedReleaseEventV0 & {
  signature: Ed25519Signature;
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
  publish_release(event: VeritasReleaseEventV0): Promise<void>;
  list_releases(): Promise<VeritasReleaseEventV0[]>;
  find_release(
    input: FindReleaseInput,
  ): Promise<VeritasReleaseEventV0 | undefined>;
  has_release(input: HasReleaseInput): Promise<boolean>;
};
