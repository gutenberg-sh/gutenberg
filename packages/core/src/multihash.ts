import { sha256_prefix, type Sha256Hash } from './types.js';

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

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
