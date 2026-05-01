export const PRODUCTION_DEFAULTS = {
  GUTENBERG_CLI_IRYS_NETWORK: 'mainnet',
  GUTENBERG_CLI_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
  GUTENBERG_CLI_GATEWAY_URL: 'https://gutenberg.sh',
} as const;

export const IRYS_GATEWAY_BY_NETWORK = {
  mainnet: 'https://gateway.irys.xyz',
  devnet: 'https://devnet.irys.xyz',
} as const;
