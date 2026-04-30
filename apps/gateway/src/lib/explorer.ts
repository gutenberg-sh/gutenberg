import { env } from '@/env';

const ADDRESS_PLACEHOLDER = '{address}';

/**
 * Builds a block explorer URL for a Solana address using
 * `VITE_GUTENBERG_EXPLORER_URL`. Returns `undefined` when the env var is not
 * configured, so callers can hide the link.
 */
export function explorer_address_url(address: string): string | undefined {
  const template = env.VITE_GUTENBERG_EXPLORER_URL;

  if (!template) {
    return undefined;
  }

  return template.replaceAll(
    ADDRESS_PLACEHOLDER,
    encodeURIComponent(address),
  );
}
