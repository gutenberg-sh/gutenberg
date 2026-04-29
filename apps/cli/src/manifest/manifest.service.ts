import { Injectable } from '@nestjs/common';
import bs58 from 'bs58';
import { createHash, createPublicKey, sign, verify } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

import {
  manifest_type,
  sha256_prefix,
  signature_prefix,
  type SolanaPublicKey,
  type Sha256Hash,
  type GutenbergManifestFileV0,
  type GutenbergManifestV0,
  type GutenbergUnsignedManifestV0,
} from './manifest.types';

@Injectable()
export class ManifestService {
  sha256_hash(data: Buffer | string): Sha256Hash {
    return `${sha256_prefix}${createHash('sha256').update(data).digest('hex')}`;
  }

  verify_file_hash(
    file: GutenbergManifestFileV0,
    data: Buffer | string,
  ): boolean {
    return this.sha256_hash(data) === file.hash;
  }

  sign_manifest(
    unsigned_manifest: GutenbergUnsignedManifestV0,
    private_key: KeyObject,
  ): GutenbergManifestV0 {
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

  verify_manifest(manifest: unknown): manifest is GutenbergManifestV0 {
    try {
      this.assert_valid_manifest(manifest);

      const { signature, ...unsigned_manifest } = manifest;
      const public_key = this.decode_publisher_public_key(manifest.publisher);
      const signature_bytes = this.decode_prefixed_base64url(
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
  ): asserts manifest is GutenbergManifestV0 {
    this.assert_record(manifest, 'manifest');
    this.assert_exact_keys(manifest, manifest_keys, 'manifest');

    if (!this.is_prefixed_base64url(manifest.signature, signature_prefix)) {
      throw new Error('Manifest signature must be an ed25519 base64url value');
    }

    this.assert_valid_manifest_fields(manifest);
  }

  assert_valid_unsigned_manifest(
    manifest: unknown,
  ): asserts manifest is GutenbergUnsignedManifestV0 {
    this.assert_record(manifest, 'manifest');

    const keys = new Set(manifest_keys);
    keys.delete('signature');
    this.assert_exact_keys(manifest, keys, 'unsigned manifest');
    this.assert_valid_manifest_fields(manifest);
  }

  canonical_json(value: unknown): string {
    return JSON.stringify(this.to_canonical_value(value));
  }

  decode_publisher_public_key(publisher: SolanaPublicKey): KeyObject {
    const public_key_bytes = bs58.decode(publisher);

    if (public_key_bytes.byteLength !== solana_public_key_length) {
      throw new Error('Publisher must be a Solana public key');
    }

    return createPublicKey({
      key: Buffer.concat([
        ed25519_spki_prefix,
        Buffer.from(public_key_bytes),
      ]),
      format: 'der',
      type: 'spki',
    });
  }

  private decode_prefixed_base64url(value: string, prefix: string): Buffer {
    if (!this.is_prefixed_base64url(value, prefix)) {
      throw new Error(`Expected ${prefix} base64url value`);
    }

    return Buffer.from(value.slice(prefix.length), 'base64url');
  }

  private is_prefixed_base64url<const Prefix extends string>(
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

  private assert_valid_manifest_fields(
    manifest: Record<string, unknown>,
  ): asserts manifest is GutenbergUnsignedManifestV0 {
    if (manifest.type !== manifest_type) {
      throw new Error(`Manifest type must be ${manifest_type}`);
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

    this.assert_absolute_path(manifest.entry, 'Manifest entry');

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

    this.assert_valid_files(manifest.files);

    if (!(manifest.entry in manifest.files)) {
      throw new Error('Manifest entry must exist in files');
    }
  }

  private assert_valid_files(
    files: unknown,
  ): asserts files is GutenbergUnsignedManifestV0['files'] {
    this.assert_record(files, 'manifest files');

    if (Object.keys(files).length === 0) {
      throw new Error('Manifest files must not be empty');
    }

    for (const [path, file] of Object.entries(files)) {
      this.assert_absolute_path(path, 'Manifest file path');
      this.assert_record(file, `manifest file ${path}`);
      this.assert_exact_keys(file, file_keys, `manifest file ${path}`);

      if (
        typeof file.hash !== 'string' ||
        !/^sha256:[a-f0-9]{64}$/.test(file.hash)
      ) {
        throw new Error(
          `Manifest file ${path} hash must be a sha256 hex digest`,
        );
      }

      if (
        typeof file.uri !== 'string' ||
        !/^s3:\/\/[^/]+\/.+$/.test(file.uri)
      ) {
        throw new Error(
          `Manifest file ${path} uri must be an immutable s3:// URI`,
        );
      }
    }
  }

  private assert_absolute_path(
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

  private assert_record(
    value: unknown,
    label: string,
  ): asserts value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${label} must be an object`);
    }
  }

  private assert_exact_keys(
    value: Record<string, unknown>,
    allowed_keys: ReadonlySet<string>,
    label: string,
  ): void {
    for (const key of Object.keys(value)) {
      if (!allowed_keys.has(key)) {
        throw new Error(`${label} contains unknown field ${key}`);
      }
    }

    for (const key of allowed_keys) {
      if (!(key in value)) {
        throw new Error(`${label} is missing required field ${key}`);
      }
    }
  }

  private to_canonical_value(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((child) => this.to_canonical_value(child));
    }

    if (this.is_plain_object(value)) {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, child]) => [key, this.to_canonical_value(child)]),
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

  private is_plain_object(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

const manifest_keys = new Set([
  'type',
  'name',
  'version',
  'entry',
  'files',
  'publisher',
  'created_at',
  'signature',
]);

const file_keys = new Set(['hash', 'uri']);
const solana_public_key_length = 32;
const ed25519_spki_prefix = Buffer.from('302a300506032b6570032100', 'hex');
