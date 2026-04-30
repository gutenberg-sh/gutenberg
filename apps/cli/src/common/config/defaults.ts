export const PRODUCTION_DEFAULTS = {
  GUTENBERG_ARWEAVE_MIRRORS:
    'https://arweave.net,https://ar-io.dev,https://g8way.io,https://permagate.io',
  GUTENBERG_IRYS_NETWORK: 'mainnet',
  GUTENBERG_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
  GUTENBERG_GATEWAY_URL: 'https://gutenberg.sh',
} as const;

export const IRYS_GATEWAY_BY_NETWORK = {
  mainnet: 'https://gateway.irys.xyz',
  devnet: 'https://devnet.irys.xyz',
} as const;
