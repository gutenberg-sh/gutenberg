export const manifest_type = 'veritas.markdown.site.v0' as const;
export const signature_prefix = 'ed25519:' as const;
export const sha256_prefix = 'sha256:' as const;

export type S3Uri = `s3://${string}`;
export type ContentUri = S3Uri;
export type SolanaPublicKey = string;
export type Ed25519Signature = `${typeof signature_prefix}${string}`;
export type Sha256Hash = `${typeof sha256_prefix}${string}`;

export type VeritasManifestFileV0 = {
  hash: Sha256Hash;
  uri: ContentUri;
};

export type VeritasUnsignedManifestV0 = {
  type: typeof manifest_type;
  name: string;
  version: string;
  entry: `/${string}`;
  files: Record<`/${string}`, VeritasManifestFileV0>;
  publisher: SolanaPublicKey;
  created_at: string;
};

export type VeritasManifestV0 = VeritasUnsignedManifestV0 & {
  signature: Ed25519Signature;
};
