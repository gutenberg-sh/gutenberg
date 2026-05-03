import { PublicKey } from '@solana/web3.js';

/** True when `address` is a valid Solana `PublicKey` (base58, on-curve). */
export function is_valid_publisher_address(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
