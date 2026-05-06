import type { Config } from 'drizzle-kit';

import { load_env_file } from './src/env-file';

load_env_file();

export default {
  schema: './src/common/database/tables/*.sql.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.GUTENBERG_INDEXER_DATABASE_URL ?? '',
  },
} satisfies Config;
