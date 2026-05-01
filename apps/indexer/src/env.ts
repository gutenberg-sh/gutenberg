import { z } from 'zod';

const default_program_id = 'NRrK71RxAHpt5CdLUWgRzTuzMopnRBnEqCiCku6J517';

export const env = z.object({
  GUTENBERG_INDEXER_NODE_ENV: z
    .enum(['development', 'production'])
    .default('development'),
  GUTENBERG_INDEXER_PORT: z.coerce.number().int().default(4000),
  GUTENBERG_INDEXER_DATABASE_URL: z.string().url(),
  GUTENBERG_INDEXER_SOLANA_RPC_URL: z.string().url(),
  GUTENBERG_INDEXER_SOLANA_WS_URL: z.string().url().optional(),
  GUTENBERG_INDEXER_PROGRAM_ID: z.string().min(32).default(default_program_id),
  GUTENBERG_INDEXER_BACKFILL_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(1000),
  GUTENBERG_INDEXER_BACKFILL_TX_CONCURRENCY: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(5),
  GUTENBERG_INDEXER_RECONCILE_LOOKBACK_SLOTS: z.coerce
    .number()
    .int()
    .min(0)
    .default(5000),
  GUTENBERG_INDEXER_CORS_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof env>;
