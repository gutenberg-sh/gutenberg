import { env } from '@/env';

const ADDRESS_PLACEHOLDER = '{address}';

export function explorer_address_url(address: string): string {
  const template = env.VITE_GUTENBERG_EXPLORER_URL;
  return template.replaceAll(ADDRESS_PLACEHOLDER, encodeURIComponent(address));
}

/**
 * Best-effort transaction link derived from the configured address explorer URL
 * (e.g. Solana Explorer `/address/{address}` → `/tx/<signature>`).
 */
export function explorer_transaction_url(
  signature: string,
): string | undefined {
  const template = env.VITE_GUTENBERG_EXPLORER_URL;
  const with_tx = template
    .replace('/address/{address}', `/tx/${encodeURIComponent(signature)}`)
    .replace('/account/{address}', `/tx/${encodeURIComponent(signature)}`);

  if (with_tx !== template) {
    return with_tx;
  }

  return undefined;
}
