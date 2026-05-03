/**
 * Aligns Irys builder mode with the configured bundler URL.
 * Defaults to devnet when the hostname is ambiguous.
 */
export function irys_network_from_bundler_url(bundler_url: string): 'mainnet' | 'devnet' {
  let host: string;

  try {
    host = new URL(bundler_url).hostname.toLowerCase();
  } catch {
    return 'devnet';
  }

  if (host.includes('devnet')) {
    return 'devnet';
  }

  if (host.includes('mainnet')) {
    return 'mainnet';
  }

  return 'devnet';
}
