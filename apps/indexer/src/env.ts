import { z } from 'zod';

export const env = z.object({
  GUTENBERG_INDEXER_NODE_ENV: z.enum(['development', 'production']),
  GUTENBERG_INDEXER_PORT: z.coerce.number().int(),
  GUTENBERG_INDEXER_DATABASE_URL: z.string().url(),
  GUTENBERG_INDEXER_SOLANA_RPC_URL: z.string().url(),
  GUTENBERG_INDEXER_SOLANA_WS_URL: z.string().url(),
  GUTENBERG_INDEXER_BACKFILL_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000),
  GUTENBERG_INDEXER_BACKFILL_TX_CONCURRENCY: z.coerce
    .number()
    .int()
    .min(1)
    .max(50),
  GUTENBERG_INDEXER_CORS_ORIGINS: z
    .string()
    .min(1)
    .refine(
      (raw) => raw.split(',').some((entry) => entry.trim().length > 0),
      {
        message:
          'GUTENBERG_INDEXER_CORS_ORIGINS must list at least one origin',
      },
    ),
});

export type Env = z.infer<typeof env>;
