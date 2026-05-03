import { PublicKey } from '@solana/web3.js';

export {
  decode_publisher_public_key,
  decode_signature,
  encode_signature,
  verify_ed25519,
  is_on_curve,
  base64url_decode,
  base64url_encode,
} from '@gutenberg/core';

/** True when `address` is a valid Solana `PublicKey` (base58, on-curve). */
export function is_valid_publisher_address(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
