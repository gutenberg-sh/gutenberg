import { base58_decode } from './base58.js';
import { canonical_json } from './canonical-json.js';
import { is_content_uri } from './content-uri.js';
import {
  decode_publisher_public_key,
  decode_signature,
  verify_ed25519,
} from './ed25519.js';
import { sha256_hash } from './hash.js';
import { is_sha256_hash } from './multihash.js';
import {
  MANIFEST_SCHEMA_VERSION,
  STORAGE_LAYOUT_PER_FILE,
  signature_prefix,
  type GutenbergManifest,
  type GutenbergManifestFile,
  type GutenbergUnsignedManifest,
  type Sha256Hash,
} from './types.js';

const SOLANA_PUBLIC_KEY_LENGTH = 32;

const manifest_required_keys: ReadonlySet<string> = new Set([
  'schema_version',
  'storage_layout',
  'name',
  'version',
  'publisher',
  'published_at',
  'entry',
  'files',
  'content_hash',
  'content_size_bytes',
  'chain',
]);
const manifest_optional_keys: ReadonlySet<string> = new Set([
  'prev_version',
  'license',
  'language',
  'tags',
]);
const file_required_keys: ReadonlySet<string> = new Set([
  'hash',
  'size_bytes',
  'uri',
]);
const file_optional_keys: ReadonlySet<string> = new Set(['mime']);
const chain_keys: ReadonlySet<string> = new Set(['chain_id', 'program_id']);

export const SPDX_LICENSE_RE = /^[A-Za-z0-9.+-]+$/;
export const BCP47_LANGUAGE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
export const TAG_RE = /^[a-z0-9][a-z0-9._-]{0,31}$/;

export function assert_valid_manifest(
  manifest: unknown,
): asserts manifest is GutenbergManifest {
  assert_record(manifest, 'manifest');

  if (!is_prefixed_base64url(manifest.signature, signature_prefix)) {
    throw new Error('Manifest signature must be an ed25519 base64url value');
  }

  assert_valid_unsigned_manifest_record(manifest);
}

export function assert_valid_unsigned_manifest(
  manifest: unknown,
): asserts manifest is GutenbergUnsignedManifest {
  assert_record(manifest, 'manifest');
  assert_valid_unsigned_manifest_record(manifest);
}

export function verify_manifest_signature(
  manifest: GutenbergManifest,
): boolean {
  try {
    const { signature, ...unsigned } = manifest;
    const public_key = decode_publisher_public_key(manifest.publisher);
    const signature_bytes = decode_signature(signature);

    return verify_ed25519(canonical_json(unsigned), signature_bytes, public_key);
  } catch {
    return false;
  }
}

function assert_valid_unsigned_manifest_record(
  manifest: Record<string, unknown>,
): asserts manifest is GutenbergUnsignedManifest {
  const allowed = new Set<string>(manifest_required_keys);

  if ('signature' in manifest) {
    allowed.add('signature');
  }

  for (const key of manifest_optional_keys) {
    allowed.add(key);
  }

  for (const key of Object.keys(manifest)) {
    if (!allowed.has(key)) {
      throw new Error(`manifest contains unknown field ${key}`);
    }
  }

  for (const key of manifest_required_keys) {
    if (!(key in manifest)) {
      throw new Error(`manifest is missing required field ${key}`);
    }
  }

  if (manifest.schema_version !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported manifest schema_version (expected ${MANIFEST_SCHEMA_VERSION})`,
    );
  }

  if (manifest.storage_layout !== STORAGE_LAYOUT_PER_FILE) {
    throw new Error(
      `Unsupported manifest storage_layout (expected ${STORAGE_LAYOUT_PER_FILE})`,
    );
  }

  if (
    typeof manifest.name !== 'string' ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(manifest.name)
  ) {
    throw new Error(
      'Manifest name must use lowercase letters, numbers, dots, underscores, or hyphens',
    );
  }

  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error('Manifest version is required');
  }

  if (typeof manifest.publisher !== 'string') {
    throw new Error('Manifest publisher must be a Solana public key');
  }
  decode_publisher_public_key(manifest.publisher);

  if (
    typeof manifest.published_at !== 'string' ||
    Number.isNaN(Date.parse(manifest.published_at))
  ) {
    throw new Error('Manifest published_at must be an ISO timestamp');
  }

  assert_absolute_path(manifest.entry, 'Manifest entry');
  assert_valid_files(manifest.files);

  const entry = manifest.entry as string;
  if (!(entry in (manifest.files as object))) {
    throw new Error('Manifest entry must exist in files');
  }

  if (!is_sha256_hash(manifest.content_hash)) {
    throw new Error('Manifest content_hash must be sha256:<64 hex>');
  }

  if (
    typeof manifest.content_size_bytes !== 'number' ||
    !Number.isInteger(manifest.content_size_bytes) ||
    manifest.content_size_bytes < 0
  ) {
    throw new Error('Manifest content_size_bytes must be a non-negative integer');
  }

  const computed_size = Object.values(
    manifest.files as Record<string, GutenbergManifestFile>,
  ).reduce((acc, f) => acc + f.size_bytes, 0);
  if (computed_size !== manifest.content_size_bytes) {
    throw new Error(
      'Manifest content_size_bytes must equal sum of files[*].size_bytes',
    );
  }

  assert_valid_chain_binding(manifest.chain);

  if ('prev_version' in manifest && manifest.prev_version !== undefined) {
    if (
      typeof manifest.prev_version !== 'string' ||
      manifest.prev_version.length === 0
    ) {
      throw new Error('Manifest prev_version must be a non-empty string');
    }
  }

  if ('license' in manifest && manifest.license !== undefined) {
    if (
      typeof manifest.license !== 'string' ||
      !SPDX_LICENSE_RE.test(manifest.license)
    ) {
      throw new Error('Manifest license must be an SPDX-style identifier');
    }
  }

  if ('language' in manifest && manifest.language !== undefined) {
    if (
      typeof manifest.language !== 'string' ||
      !BCP47_LANGUAGE_RE.test(manifest.language)
    ) {
      throw new Error('Manifest language must be a BCP-47 tag');
    }
  }

  if ('tags' in manifest && manifest.tags !== undefined) {
    if (!Array.isArray(manifest.tags)) {
      throw new Error('Manifest tags must be an array');
    }
    for (const tag of manifest.tags) {
      if (typeof tag !== 'string' || !TAG_RE.test(tag)) {
        throw new Error(
          'Manifest tags must be lowercase identifiers (a-z 0-9 . _ -, ≤ 32 chars)',
        );
      }
    }
  }
}

function assert_valid_files(
  files: unknown,
): asserts files is GutenbergUnsignedManifest['files'] {
  assert_record(files, 'manifest files');

  if (Object.keys(files).length === 0) {
    throw new Error('Manifest files must not be empty');
  }

  for (const [path, file] of Object.entries(files)) {
    assert_absolute_path(path, 'Manifest file path');
    assert_record(file, `manifest file ${path}`);

    for (const key of Object.keys(file)) {
      if (!file_required_keys.has(key) && !file_optional_keys.has(key)) {
        throw new Error(`manifest file ${path} contains unknown field ${key}`);
      }
    }
    for (const key of file_required_keys) {
      if (!(key in file)) {
        throw new Error(
          `manifest file ${path} is missing required field ${key}`,
        );
      }
    }

    if (!is_sha256_hash(file.hash)) {
      throw new Error(
        `Manifest file ${path} hash must be a sha256:<64 hex> digest`,
      );
    }

    if (
      typeof file.size_bytes !== 'number' ||
      !Number.isInteger(file.size_bytes) ||
      file.size_bytes < 0
    ) {
      throw new Error(
        `Manifest file ${path} size_bytes must be a non-negative integer`,
      );
    }

    if (!is_content_uri(file.uri)) {
      throw new Error(`Manifest file ${path} uri must be ar://<arweave-tx-id>`);
    }

    if (file.mime !== undefined && typeof file.mime !== 'string') {
      throw new Error(`Manifest file ${path} mime must be a string`);
    }
  }
}

function assert_valid_chain_binding(chain: unknown): void {
  assert_record(chain, 'manifest chain');

  for (const key of Object.keys(chain)) {
    if (!chain_keys.has(key)) {
      throw new Error(`manifest chain contains unknown field ${key}`);
    }
  }
  for (const key of chain_keys) {
    if (!(key in chain)) {
      throw new Error(`manifest chain is missing required field ${key}`);
    }
  }

  if (
    typeof chain.chain_id !== 'string' ||
    !chain.chain_id.startsWith('solana:') ||
    chain.chain_id.length <= 'solana:'.length
  ) {
    throw new Error('Manifest chain.chain_id must be solana:<cluster>');
  }

  if (typeof chain.program_id !== 'string') {
    throw new Error('Manifest chain.program_id must be a Solana public key');
  }

  try {
    const bytes = base58_decode(chain.program_id);
    if (bytes.byteLength !== SOLANA_PUBLIC_KEY_LENGTH) {
      throw new Error('not 32 bytes');
    }
  } catch {
    throw new Error(
      'Manifest chain.program_id is not a valid base58 Solana key',
    );
  }
}

function assert_absolute_path(
  value: unknown,
  label: string,
): asserts value is `/${string}` {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.includes('..')
  ) {
    throw new Error(
      `${label} must be an absolute path without parent segments`,
    );
  }
}

function assert_record(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function is_prefixed_base64url<const Prefix extends string>(
  value: unknown,
  prefix: Prefix,
): value is `${Prefix}${string}` {
  return (
    typeof value === 'string' &&
    value.startsWith(prefix) &&
    value.length > prefix.length &&
    /^[A-Za-z0-9_-]+$/.test(value.slice(prefix.length))
  );
}

export function strip_utf8_bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function files_content_hash(
  files: GutenbergUnsignedManifest['files'],
): Sha256Hash {
  return sha256_hash(canonical_json(files));
}
