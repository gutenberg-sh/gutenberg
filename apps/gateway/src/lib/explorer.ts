import { env } from '@/env';

const ADDRESS_PLACEHOLDER = '{address}';

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
