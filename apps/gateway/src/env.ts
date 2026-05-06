import { z } from 'zod';

import { parse_gateway_list } from '@gutenberg/core';

const env_schema = z.object({
  VITE_GUTENBERG_SOLANA_RPC_URL: z.string().url(),
  VITE_GUTENBERG_IRYS_GATEWAY: z
    .string()
    .url()
    .transform((raw) => raw.replace(/\/$/, '')),
  VITE_GUTENBERG_IRYS_NETWORK: z.enum(['mainnet', 'devnet']),
  VITE_GUTENBERG_ARWEAVE_MIRRORS: z
    .string()
    .min(1)
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
    })
    .refine((list) => list.length > 0, {
      message:
        'VITE_GUTENBERG_ARWEAVE_MIRRORS must list at least one mirror URL',
    }),
  VITE_GUTENBERG_EXPLORER_URL: z
    .string()
    .url()
    .refine((value) => value.includes('{address}'), {
      message:
        'VITE_GUTENBERG_EXPLORER_URL must contain the `{address}` placeholder',
    }),
  VITE_GUTENBERG_INDEXER_URL: z
    .string()
    .url()
    .transform((raw) => raw.replace(/\/$/, '')),
});

export const env = env_schema.parse(import.meta.env);
