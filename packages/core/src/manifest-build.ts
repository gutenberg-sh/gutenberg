import { canonical_json } from './canonical-json.js';
import { encode_signature } from './ed25519.js';
import { sha256_hash } from './hash.js';
import { files_content_hash } from './manifest.js';
import {
  MANIFEST_SCHEMA_VERSION,
  STORAGE_LAYOUT_PER_FILE,
  type ChainId,
  type GutenbergManifest,
  type GutenbergManifestFile,
  type GutenbergUnsignedManifest,
  type Sha256Hash,
  type SolanaPublicKey,
} from './types.js';

export type ManifestSignerInput = {
  message: Uint8Array;
};

export type ManifestSigner = (
  input: ManifestSignerInput,
) => Promise<Uint8Array>;

export type BuildManifestInput = {
  name: string;
  version: string;
  publisher: SolanaPublicKey;
  created_at?: string;
  entry?: `/${string}`;
  files: Record<`/${string}`, GutenbergManifestFile>;
  chain: { chain_id: ChainId; program_id: SolanaPublicKey };
  prev_version?: string;
  license?: string;
  language?: string;
  tags?: string[];
};

export function build_unsigned_manifest(
  input: BuildManifestInput,
): GutenbergUnsignedManifest {
  const created_at = input.created_at ?? new Date().toISOString();
  const entry = input.entry ?? '/index.md';
  const content_size_bytes = Object.values(input.files).reduce(
    (acc, file) => acc + file.size_bytes,
    0,
  );
  const content_hash = files_content_hash(input.files);

  const manifest: GutenbergUnsignedManifest = {
    schema_version: MANIFEST_SCHEMA_VERSION,
    storage_layout: STORAGE_LAYOUT_PER_FILE,
    name: input.name,
    version: input.version,
    publisher: input.publisher,
    created_at,
    entry,
    files: input.files,
    content_hash,
    content_size_bytes,
    chain: input.chain,
    ...(input.prev_version ? { prev_version: input.prev_version } : {}),
    ...(input.license ? { license: input.license } : {}),
    ...(input.language ? { language: input.language } : {}),
    ...(input.tags && input.tags.length > 0 ? { tags: input.tags } : {}),
  };

  return manifest;
}

export function manifest_signing_message(
  unsigned_manifest: GutenbergUnsignedManifest,
): { message: Uint8Array; canonical_text: string } {
  const canonical_text = canonical_json(unsigned_manifest);
  const message = new TextEncoder().encode(canonical_text);

  return { message, canonical_text };
}

export async function sign_manifest(
  unsigned_manifest: GutenbergUnsignedManifest,
  signer: ManifestSigner,
): Promise<{ manifest: GutenbergManifest; canonical_json: string }> {
  const { message, canonical_text } =
    manifest_signing_message(unsigned_manifest);
  const signature_bytes = await signer({ message });

  if (signature_bytes.byteLength !== 64) {
    throw new Error(
      `Manifest signer must return a 64-byte ed25519 signature, got ${signature_bytes.byteLength}`,
    );
  }

  const manifest: GutenbergManifest = {
    ...unsigned_manifest,
    signature: encode_signature(signature_bytes),
  };

  return { manifest, canonical_json: canonical_text };
}

export function manifest_hash(manifest_canonical_json: string): Sha256Hash {
  return sha256_hash(manifest_canonical_json);
}
