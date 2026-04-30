import { z } from 'zod';

import { parse_gateway_list } from '@/lib/gateway-list';

const env_schema = z.object({
  VITE_GUTENBERG_REGISTRY_PROGRAM_ID: z.string().min(1),
  VITE_GUTENBERG_SOLANA_RPC_URL: z.string().url(),
  VITE_GUTENBERG_IRYS_GATEWAY: z
    .string()
    .url()
    .transform((raw) => raw.replace(/\/$/, '')),
  VITE_GUTENBERG_ARWEAVE_MIRRORS: z
    .string()
    .default('')
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
  VITE_GUTENBERG_EXPLORER_URL: z
    .string()
    .url()
    .refine((value) => value.includes('{address}'), {
      message: 'VITE_GUTENBERG_EXPLORER_URL must contain the `{address}` placeholder',
    })
    .optional(),
});

export const env = env_schema.parse(import.meta.env);

export type Env = z.infer<typeof env_schema>;
