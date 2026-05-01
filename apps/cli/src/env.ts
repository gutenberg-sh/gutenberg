import { z } from 'zod';

import { PRODUCTION_DEFAULTS } from './common/config/defaults';

export const env = z.object({
  GUTENBERG_IRYS_GATEWAY: z.string().url().optional(),
  GUTENBERG_IRYS_NETWORK: z
    .enum(['mainnet', 'devnet'])
    .default(PRODUCTION_DEFAULTS.GUTENBERG_IRYS_NETWORK),
  GUTENBERG_SOLANA_RPC_URL: z
    .string()
    .url()
    .default(PRODUCTION_DEFAULTS.GUTENBERG_SOLANA_RPC_URL),
  GUTENBERG_GATEWAY_URL: z
    .string()
    .url()
    .default(PRODUCTION_DEFAULTS.GUTENBERG_GATEWAY_URL),
});

export type Env = z.infer<typeof env>;
