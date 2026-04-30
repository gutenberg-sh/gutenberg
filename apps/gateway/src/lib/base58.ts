import { base58 } from '@scure/base';

export function base58_decode(value: string): Uint8Array {
  return base58.decode(value);
}

export function base58_encode(bytes: Uint8Array): string {
  return base58.encode(bytes);
}
