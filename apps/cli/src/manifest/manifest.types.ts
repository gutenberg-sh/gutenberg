export const signature_prefix = 'ed25519:' as const;
export const sha256_prefix = 'sha256:' as const;

export type S3Uri = `s3://${string}`;
export type ContentUri = S3Uri;
export type SolanaPublicKey = string;
export type Ed25519Signature = `${typeof signature_prefix}${string}`;
export type Sha256Hash = `${typeof sha256_prefix}${string}`;

export type GutenbergManifestFile = {
  hash: Sha256Hash;
};

export type GutenbergUnsignedManifest = {
  /** Single POSIX tar of all site files (content-addressed blob in storage). */
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
