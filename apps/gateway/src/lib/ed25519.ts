import { address } from '@solana/addresses';

/** True when `address` is a valid Solana base account address. */
export function is_valid_publisher_address(value: string): boolean {
  try {
    address(value);
    return true;
  } catch {
    return false;
  }
}
