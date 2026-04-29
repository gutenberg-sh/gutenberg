export const manifest_type = 'gutenberg.markdown.site.v0' as const;
export const signature_prefix = 'ed25519:' as const;
export const sha256_prefix = 'sha256:' as const;

export type S3Uri = `s3://${string}`;
export type ContentUri = S3Uri;
export type SolanaPublicKey = string;
export type Ed25519Signature = `${typeof signature_prefix}${string}`;
export type Sha256Hash = `${typeof sha256_prefix}${string}`;

export type GutenbergManifestFileV0 = {
  hash: Sha256Hash;
  uri: ContentUri;
};

export type GutenbergUnsignedManifestV0 = {
  type: typeof manifest_type;
  name: string;
  version: string;
  entry: `/${string}`;
  files: Record<`/${string}`, GutenbergManifestFileV0>;
  publisher: SolanaPublicKey;
  created_at: string;
};

export type GutenbergManifestV0 = GutenbergUnsignedManifestV0 & {
  signature: Ed25519Signature;
};
