import { z } from 'zod';

export const env = z.object({
  GUTENBERG_API_NODE_ENV: z.enum(['development', 'production']),
  GUTENBERG_API_PORT: z.coerce.number().int(),
  GUTENBERG_API_DATABASE_URL: z.string().url(),
  GUTENBERG_API_CORS_ORIGINS: z
    .string()
    .min(1)
    .refine((raw) => raw.split(',').some((entry) => entry.trim().length > 0), {
      message: 'GUTENBERG_API_CORS_ORIGINS must list at least one origin',
    }),
});

export type Env = z.infer<typeof env>;
