import { z } from 'zod';

import { PRODUCTION_DEFAULTS } from './common/config/defaults';

export const env = z.object({
  GUTENBERG_CLI_IRYS_GATEWAY: z.string().url().optional(),
  GUTENBERG_CLI_IRYS_NETWORK: z
    .enum(['mainnet', 'devnet'])
    .default(PRODUCTION_DEFAULTS.GUTENBERG_CLI_IRYS_NETWORK),
  GUTENBERG_CLI_SOLANA_RPC_URL: z
    .string()
    .url()
    .default(PRODUCTION_DEFAULTS.GUTENBERG_CLI_SOLANA_RPC_URL),
  GUTENBERG_CLI_GATEWAY_URL: z
    .string()
    .url()
    .default(PRODUCTION_DEFAULTS.GUTENBERG_CLI_GATEWAY_URL),
});

export type Env = z.infer<typeof env>;
