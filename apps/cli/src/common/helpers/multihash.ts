import { sha256_prefix, type Sha256Hash } from '../types/manifest.types';

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

export function parse_hash(value: string): { algo: 'sha256'; hex: string } {
  const idx = value.indexOf(':');

  if (idx <= 0) {
    throw new Error(`Hash value must be "<algo>:<hex>", got ${value}`);
  }

  const algo = value.slice(0, idx);
  const digest = value.slice(idx + 1);

  if (algo !== 'sha256') {
    throw new Error(`Unsupported hash algorithm: ${algo}`);
  }

  if (!SHA256_HEX_RE.test(digest)) {
    throw new Error('sha256 digest must be 64 lowercase hex characters');
  }

  return { algo: 'sha256', hex: digest };
}

export function is_sha256_hash(value: unknown): value is Sha256Hash {
  if (typeof value !== 'string' || !value.startsWith(sha256_prefix)) {
    return false;
  }

  return SHA256_HEX_RE.test(value.slice(sha256_prefix.length));
}

export function assert_sha256_hash(
  value: unknown,
  label: string,
): asserts value is Sha256Hash {
  if (!is_sha256_hash(value)) {
    throw new Error(`${label} must be a sha256:<64 hex> digest`);
  }
}
