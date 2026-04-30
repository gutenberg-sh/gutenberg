import { z } from 'zod';

const env_schema = z.object({
  VITE_GUTENBERG_REGISTRY_PROGRAM_ID: z.string().min(1),
  VITE_GUTENBERG_SOLANA_RPC_URL: z.string().url(),
  VITE_GUTENBERG_ARWEAVE_GATEWAY: z.string().url(),
});

export const env = env_schema.parse(import.meta.env);

export type Env = z.infer<typeof env_schema>;
