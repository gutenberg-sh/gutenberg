import type { ChainId } from '../types/manifest.types';

export function infer_chain_id(rpc_url: string): ChainId {
  let host: string;

  try {
    host = new URL(rpc_url).hostname.toLowerCase();
  } catch {
    return 'solana:unknown';
  }

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0'
  ) {
    return 'solana:localnet';
  }

  if (host.includes('devnet')) {
    return 'solana:devnet';
  }

  if (host.includes('testnet')) {
    return 'solana:testnet';
  }

  if (host.includes('mainnet') || host === 'api.mainnet-beta.solana.com') {
    return 'solana:mainnet';
  }

  return 'solana:unknown';
}
