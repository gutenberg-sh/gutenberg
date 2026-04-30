import { canonical_json } from './canonical-json';
import {
  decode_publisher_public_key,
  decode_signature,
  verify_ed25519,
} from './ed25519';
import {
  signature_prefix,
  type GutenbergManifest,
  type GutenbergUnsignedManifest,
} from './types';

const manifest_signed_keys: ReadonlySet<string> = new Set([
  'name',
  'version',
  'entry',
  'files',
  'publisher',
  'created_at',
  'bundle_uri',
  'bundle_hash',
  'signature',
]);

const file_keys: ReadonlySet<string> = new Set(['hash']);

export function assert_valid_manifest(
  manifest: unknown,
): asserts manifest is GutenbergManifest {
  assert_record(manifest, 'manifest');
  assert_exact_keys(manifest, manifest_signed_keys, 'manifest');

  if (!is_prefixed_base64url(manifest.signature, signature_prefix)) {
    throw new Error('Manifest signature must be an ed25519 base64url value');
  }

  assert_valid_manifest_fields(manifest);
}

export function verify_manifest_signature(
  manifest: GutenbergManifest,
): boolean {
  try {
    const { signature, ...unsigned } = manifest;
    const public_key = decode_publisher_public_key(manifest.publisher);
    const signature_bytes = decode_signature(signature);

    return verify_ed25519(
      canonical_json(unsigned),
      signature_bytes,
      public_key,
    );
  } catch {
    return false;
  }
}

function assert_valid_manifest_fields(
  manifest: Record<string, unknown>,
): asserts manifest is GutenbergUnsignedManifest {
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

  assert_absolute_path(manifest.entry, 'Manifest entry');

  if (typeof manifest.publisher !== 'string') {
    throw new Error('Manifest publisher must be a Solana public key');
  }

  decode_publisher_public_key(manifest.publisher);

  if (
    typeof manifest.created_at !== 'string' ||
    Number.isNaN(Date.parse(manifest.created_at))
  ) {
    throw new Error('Manifest created_at must be an ISO timestamp');
  }

  if (
    typeof manifest.bundle_uri !== 'string' ||
    !is_http_url(manifest.bundle_uri)
  ) {
    throw new Error('Manifest bundle_uri must be an http(s) URL');
  }

  if (
    typeof manifest.bundle_hash !== 'string' ||
    !/^sha256:[a-f0-9]{64}$/.test(manifest.bundle_hash)
  ) {
    throw new Error('Manifest bundle_hash must be a sha256 hex digest');
  }

  assert_valid_files(manifest.files);

  const entry = manifest.entry;
  if (typeof entry !== 'string' || !(entry in (manifest.files as object))) {
    throw new Error('Manifest entry must exist in files');
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
    assert_exact_keys(file, file_keys, `manifest file ${path}`);

    if (
      typeof file.hash !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(file.hash)
    ) {
      throw new Error(`Manifest file ${path} hash must be a sha256 hex digest`);
    }
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

function is_http_url(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
