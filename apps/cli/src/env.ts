import { z } from 'zod';

export const env = z.object({
  GUTENBERG_ARWEAVE_GATEWAY: z.string().url(),
  GUTENBERG_IRYS_NETWORK: z.enum(['mainnet', 'devnet']),
  GUTENBERG_SOLANA_RPC_URL: z.string().url(),
  GUTENBERG_SOLANA_PRIVATE_KEY: z.string(),
});

export type Env = z.infer<typeof env>;
