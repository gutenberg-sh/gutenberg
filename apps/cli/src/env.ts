import { z } from 'zod';

export const env = z.object({
  VERITAS_STORAGE_ENDPOINT: z.string().url(),
  VERITAS_STORAGE_BUCKET: z.string(),
  VERITAS_STORAGE_ACCESS_KEY: z.string(),
  VERITAS_STORAGE_SECRET_KEY: z.string(),
  VERITAS_SOLANA_RPC_URL: z.string().url(),
  VERITAS_SOLANA_PRIVATE_KEY: z.string().min(1),
  VERITAS_REGISTRY_PROGRAM_ID: z.string(),
});

export type Env = z.infer<typeof env>;
