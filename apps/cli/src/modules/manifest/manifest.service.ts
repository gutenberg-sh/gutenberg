import { Injectable } from '@nestjs/common';
import bs58 from 'bs58';
import { createHash, createPublicKey, sign, verify } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

import { is_content_uri } from '../../common/helpers/content-uri';
import {
  assert_sha256_hash,
  is_sha256_hash,
} from '../../common/helpers/multihash';
import {
  MANIFEST_SCHEMA_VERSION,
  signature_prefix,
  sha256_prefix,
  STORAGE_LAYOUT_PER_FILE,
  type ChainId,
  type GutenbergManifest,
  type GutenbergManifestFile,
  type GutenbergUnsignedManifest,
  type Sha256Hash,
  type SolanaPublicKey,
} from '../../common/types/manifest.types';

const manifest_required_keys = new Set([
  'schema_version',
  'storage_layout',
  'name',
  'version',
  'publisher',
  'created_at',
  'entry',
  'files',
  'content_hash',
  'content_size_bytes',
  'chain',
]);

const manifest_optional_keys = new Set([
  'prev_version',
  'license',
  'language',
  'tags',
]);

const file_required_keys = new Set(['hash', 'size_bytes', 'uri']);
const file_optional_keys = new Set(['mime']);
const chain_keys = new Set(['chain_id', 'program_id']);

const SOLANA_PUBLIC_KEY_LENGTH = 32;
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const SPDX_LICENSE_RE = /^[A-Za-z0-9.+-]+$/;
const BCP47_LANGUAGE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const TAG_RE = /^[a-z0-9][a-z0-9._-]{0,31}$/;

@Injectable()
export class ManifestService {
  sha256_hash(data: Buffer | string): Sha256Hash {
    return `${sha256_prefix}${createHash('sha256').update(data).digest('hex')}`;
  }

  files_content_hash(
    files: GutenbergUnsignedManifest['files'],
  ): Sha256Hash {
    return this.sha256_hash(this.canonical_json(files));
  }

  verify_file_hash(
    file: { hash: Sha256Hash },
    data: Buffer | string,
  ): boolean {
    return this.sha256_hash(data) === file.hash;
  }

  sign_manifest(
    unsigned_manifest: GutenbergUnsignedManifest,
    private_key: KeyObject,
  ): GutenbergManifest {
    if (
      private_key.type !== 'private' ||
      private_key.asymmetricKeyType !== 'ed25519'
    ) {
      throw new Error('Expected an Ed25519 private key');
    }

    this.assert_valid_unsigned_manifest(unsigned_manifest);

    const signature = sign(
      null,
      Buffer.from(this.canonical_json(unsigned_manifest)),
      private_key,
    );

    return {
      ...unsigned_manifest,
      signature: `${signature_prefix}${signature.toString('base64url')}`,
    };
  }

  verify_manifest(manifest: unknown): manifest is GutenbergManifest {
    try {
      this.assert_valid_manifest(manifest);

      const { signature, ...unsigned_manifest } = manifest;
      const public_key = this.decode_publisher_public_key(manifest.publisher);
      const signature_bytes = decode_prefixed_base64url(
        signature,
        signature_prefix,
      );

      return verify(
        null,
        Buffer.from(this.canonical_json(unsigned_manifest)),
        public_key,
        signature_bytes,
      );
    } catch {
      return false;
    }
  }

  assert_valid_manifest(
    manifest: unknown,
  ): asserts manifest is GutenbergManifest {
    assert_record(manifest, 'manifest');

    if (!is_prefixed_base64url(manifest.signature, signature_prefix)) {
      throw new Error('Manifest signature must be an ed25519 base64url value');
    }

    this.assert_valid_unsigned_manifest_record(manifest);
  }

  assert_valid_unsigned_manifest(
    manifest: unknown,
  ): asserts manifest is GutenbergUnsignedManifest {
    assert_record(manifest, 'manifest');
    this.assert_valid_unsigned_manifest_record(manifest);
  }

  canonical_json(value: unknown): string {
    return JSON.stringify(to_canonical_value(value));
  }

  decode_publisher_public_key(publisher: SolanaPublicKey): KeyObject {
    const public_key_bytes = bs58.decode(publisher);

    if (public_key_bytes.byteLength !== SOLANA_PUBLIC_KEY_LENGTH) {
      throw new Error('Publisher must be a Solana public key');
    }

    return createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(public_key_bytes)]),
      format: 'der',
      type: 'spki',
    });
  }

  private assert_valid_unsigned_manifest_record(
    manifest: Record<string, unknown>,
  ): void {
    const expected_keys = new Set(manifest_required_keys);

    if ('signature' in manifest) {
      expected_keys.add('signature');
    }

    for (const key of Object.keys(manifest)) {
      if (!expected_keys.has(key) && !manifest_optional_keys.has(key)) {
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

    if (
      typeof manifest.version !== 'string' ||
      manifest.version.length === 0
    ) {
      throw new Error('Manifest version is required');
    }

    if (typeof manifest.publisher !== 'string') {
      throw new Error('Manifest publisher must be a Solana public key');
    }
    this.decode_publisher_public_key(manifest.publisher);

    if (
      typeof manifest.created_at !== 'string' ||
      Number.isNaN(Date.parse(manifest.created_at))
    ) {
      throw new Error('Manifest created_at must be an ISO timestamp');
    }

    assert_absolute_path(manifest.entry, 'Manifest entry');

    assert_valid_files(manifest.files);

    const entry = manifest.entry as string;
    if (!(entry in (manifest.files as object))) {
      throw new Error('Manifest entry must exist in files');
    }

    assert_sha256_hash(manifest.content_hash, 'Manifest content_hash');

    if (
      typeof manifest.content_size_bytes !== 'number' ||
      !Number.isInteger(manifest.content_size_bytes) ||
      manifest.content_size_bytes < 0
    ) {
      throw new Error(
        'Manifest content_size_bytes must be a non-negative integer',
      );
    }

    const computed_size = Object.values(
      manifest.files as Record<string, GutenbergManifestFile>,
    ).reduce((acc, f) => acc + f.size_bytes, 0);
    if (computed_size !== manifest.content_size_bytes) {
      throw new Error(
        'Manifest content_size_bytes must equal sum of files[*].size_bytes',
      );
    }

    const expected_content_hash = this.files_content_hash(manifest.files);
    if (manifest.content_hash !== expected_content_hash) {
      throw new Error(
        'Manifest content_hash does not match sha256 over canonical files map',
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
    assert_exact_keys(
      file,
      file_required_keys,
      file_optional_keys,
      `manifest file ${path}`,
    );

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

    if (typeof file.uri !== 'string' || !is_content_uri(file.uri)) {
      throw new Error(
        `Manifest file ${path} uri must be ar://<arweave-tx-id>`,
      );
    }

    if (file.mime !== undefined && typeof file.mime !== 'string') {
      throw new Error(`Manifest file ${path} mime must be a string`);
    }
  }
}

function assert_valid_chain_binding(
  chain: unknown,
): asserts chain is { chain_id: ChainId; program_id: string } {
  assert_record(chain, 'manifest chain');
  assert_exact_keys(chain, chain_keys, new Set(), 'manifest chain');

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
    const bytes = bs58.decode(chain.program_id);

    if (bytes.byteLength !== SOLANA_PUBLIC_KEY_LENGTH) {
      throw new Error(
        'Manifest chain.program_id must decode to 32 bytes (Solana public key)',
      );
    }
  } catch (error) {
    throw new Error(
      `Manifest chain.program_id is not a valid base58 Solana key: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
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

function assert_exact_keys(
  value: Record<string, unknown>,
  required_keys: ReadonlySet<string>,
  optional_keys: ReadonlySet<string>,
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!required_keys.has(key) && !optional_keys.has(key)) {
      throw new Error(`${label} contains unknown field ${key}`);
    }
  }

  for (const key of required_keys) {
    if (!(key in value)) {
      throw new Error(`${label} is missing required field ${key}`);
    }
  }
}

function to_canonical_value(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((child) => to_canonical_value(child));
  }

  if (is_plain_object(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, to_canonical_value(child)]),
    );
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Canonical JSON does not support non-finite numbers');
  }

  if (typeof value === 'undefined') {
    throw new Error('Canonical JSON does not support undefined');
  }

  return value;
}

function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function decode_prefixed_base64url(value: string, prefix: string): Buffer {
  if (!is_prefixed_base64url(value, prefix)) {
    throw new Error(`Expected ${prefix} base64url value`);
  }

  return Buffer.from(value.slice(prefix.length), 'base64url');
}
