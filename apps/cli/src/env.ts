import { z } from 'zod';

export const env = z.object({
  GUTENBERG_ARWEAVE_GATEWAY: z.string().url(),
  GUTENBERG_IRYS_NETWORK: z.enum(['mainnet', 'devnet']),
  GUTENBERG_SOLANA_RPC_URL: z.string().url(),
  GUTENBERG_SOLANA_PRIVATE_KEY: z.string(),
  GUTENBERG_GATEWAY_URL: z.string().url().default('http://localhost:5173'),
});

export type Env = z.infer<typeof env>;
