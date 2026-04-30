import { sha256_prefix, type Sha256Hash } from './types';

export async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', buffer);

  return new Uint8Array(digest);
}

export async function sha256_hash(
  data: Uint8Array | string,
): Promise<Sha256Hash> {
  const digest = await sha256(data);

  return `${sha256_prefix}${bytes_to_hex(digest)}`;
}

export function bytes_to_hex(bytes: Uint8Array): string {
  let out = '';

  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0');
  }

  return out;
}

export function hex_to_bytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;

  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const out = new Uint8Array(clean.length / 2);

  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);

    if (Number.isNaN(byte)) {
      throw new Error('Invalid hex string');
    }

    out[i] = byte;
  }

  return out;
}

export function bytes_equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
