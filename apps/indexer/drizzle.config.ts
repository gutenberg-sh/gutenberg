import { config as load_dotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from 'drizzle-kit';

const env_file_path = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '..', '.env'),
].find((path) => existsSync(path));

load_dotenv({ path: env_file_path, quiet: true });

export default {
  schema: './src/common/database/tables/*.sql.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.GUTENBERG_INDEXER_DATABASE_URL ?? '',
  },
} satisfies Config;
