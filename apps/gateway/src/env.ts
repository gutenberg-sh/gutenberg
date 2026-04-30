import { z } from 'zod';

const env_schema = z.object({
  VITE_GUTENBERG_REGISTRY_PROGRAM_ID: z.string().min(1),
  VITE_GUTENBERG_SOLANA_RPC_URL: z.string().url(),
  VITE_GUTENBERG_ARWEAVE_GATEWAY: z.string().url(),
  /**
   * Block explorer URL template for Solana addresses. Must include the
   * literal `{address}` placeholder, which is replaced with a base58 pubkey
   * (e.g. publisher, release PDA). Leave unset to hide explorer links.
   */
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
