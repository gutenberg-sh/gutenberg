import { ed25519 } from '@noble/curves/ed25519';

import { base58_decode } from './base58';
import {
  signature_prefix,
  type Ed25519Signature,
  type SolanaPublicKey,
} from './types';

const SOLANA_PUBLIC_KEY_LENGTH = 32;

export function decode_publisher_public_key(
  publisher: SolanaPublicKey,
): Uint8Array {
  const bytes = base58_decode(publisher);

  if (bytes.byteLength !== SOLANA_PUBLIC_KEY_LENGTH) {
    throw new Error('Publisher must be a 32-byte Solana public key');
  }

  return bytes;
}

export function decode_signature(value: Ed25519Signature): Uint8Array {
  if (!value.startsWith(signature_prefix)) {
    throw new Error(`Expected ${signature_prefix} signature`);
  }

  return base64url_decode(value.slice(signature_prefix.length));
}

export function verify_ed25519(
  message: Uint8Array | string,
  signature: Uint8Array,
  public_key: Uint8Array,
): boolean {
  const message_bytes =
    typeof message === 'string' ? new TextEncoder().encode(message) : message;

  try {
    return ed25519.verify(signature, message_bytes, public_key);
  } catch {
    return false;
  }
}

export function is_on_curve(bytes: Uint8Array): boolean {
  if (bytes.byteLength !== SOLANA_PUBLIC_KEY_LENGTH) {
    return false;
  }

  try {
    ed25519.ExtendedPoint.fromHex(bytes);
    return true;
  } catch {
    return false;
  }
}

function base64url_decode(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
