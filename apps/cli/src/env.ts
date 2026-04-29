import { z } from 'zod';

export const env = z.object({
  GUTENBERG_STORAGE_ENDPOINT: z.string().url(),
  GUTENBERG_STORAGE_BUCKET: z.string(),
  GUTENBERG_STORAGE_ACCESS_KEY: z.string(),
  GUTENBERG_STORAGE_SECRET_KEY: z.string(),
  GUTENBERG_SOLANA_RPC_URL: z.string().url(),
  GUTENBERG_SOLANA_PRIVATE_KEY: z.string().min(1),
  GUTENBERG_REGISTRY_PROGRAM_ID: z.string(),
});

export type Env = z.infer<typeof env>;
