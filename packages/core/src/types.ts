export const signature_prefix = 'ed25519:' as const;
export const sha256_prefix = 'sha256:' as const;
export const release_event_type = 'gutenberg.release.v1' as const;

export const MANIFEST_SCHEMA_VERSION = 1 as const;
export const STORAGE_LAYOUT_PER_FILE = 'per_file' as const;

export type SolanaPublicKey = string;
export type Ed25519Signature = `${typeof signature_prefix}${string}`;
export type Sha256Hash = `${typeof sha256_prefix}${string}`;

export type ContentUri = `ar://${string}`;

export type ChainId = `solana:${string}`;

export type GutenbergManifestFile = {
  hash: Sha256Hash;
  size_bytes: number;
  uri: ContentUri;
  mime?: string;
};

export type GutenbergChainBinding = {
  chain_id: ChainId;
  program_id: SolanaPublicKey;
};

export type GutenbergUnsignedManifest = {
  schema_version: typeof MANIFEST_SCHEMA_VERSION;
  storage_layout: typeof STORAGE_LAYOUT_PER_FILE;

  name: string;
  version: string;
  publisher: SolanaPublicKey;
  published_at: string;

  entry: `/${string}`;
  files: Record<`/${string}`, GutenbergManifestFile>;

  content_hash: Sha256Hash;
  content_size_bytes: number;

  chain: GutenbergChainBinding;

  prev_version?: string;
  license?: string;
  language?: string;
};

export type GutenbergManifest = GutenbergUnsignedManifest & {
  signature: Ed25519Signature;
};

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
  published_at: string;
};

export type VerifiedFile = {
  hash: Sha256Hash;
  size_bytes: number;
  uri: ContentUri;
  mime?: string;
};

export type VerifiedRelease = {
  manifest: GutenbergManifest;
  manifest_uri: ContentUri;
  release: GutenbergReleaseEvent;
  release_address: string;
  files: ReadonlyMap<`/${string}`, VerifiedFile>;
};
