export const signature_prefix = 'ed25519:' as const;
export const sha256_prefix = 'sha256:' as const;
export const release_event_type = 'gutenberg.release.v1' as const;

export type ContentUri = string;
export type SolanaPublicKey = string;
export type Ed25519Signature = `${typeof signature_prefix}${string}`;
export type Sha256Hash = `${typeof sha256_prefix}${string}`;

export type GutenbergManifestFile = {
  hash: Sha256Hash;
};

export type GutenbergUnsignedManifest = {
  bundle_uri: ContentUri;
  bundle_hash: Sha256Hash;
  name: string;
  version: string;
  entry: `/${string}`;
  files: Record<`/${string}`, GutenbergManifestFile>;
  publisher: SolanaPublicKey;
  created_at: string;
};

export type GutenbergManifest = GutenbergUnsignedManifest & {
  signature: Ed25519Signature;
};

export type GutenbergReleaseEvent = {
  type: typeof release_event_type;
  name: string;
  version: string;
  manifest: ContentUri;
  manifest_hash: Sha256Hash;
  publisher: SolanaPublicKey;
  created_at: string;
};

export type VerifiedRelease = {
  manifest: GutenbergManifest;
  manifest_uri: ContentUri;
  release_pda?: string;
  files: Map<`/${string}`, Uint8Array>;
};
