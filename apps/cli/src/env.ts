import { z } from 'zod';

import { PRODUCTION_DEFAULTS } from './common/config/defaults';
import { parse_gateway_list } from './common/helpers/gateway-list';

export const env = z.object({
  GUTENBERG_ARWEAVE_GATEWAYS: z
    .string()
    .default(PRODUCTION_DEFAULTS.GUTENBERG_ARWEAVE_GATEWAYS)
    .transform((raw, ctx) => {
      try {
        return parse_gateway_list(raw);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof Error ? error.message : String(error),
        });

        return z.NEVER;
      }
    }),
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
  GUTENBERG_SOLANA_PRIVATE_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof env>;
