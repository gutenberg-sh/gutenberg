import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

/**
 * Resolves `gutenberg publish <folder>` when the process cwd is not the repo root
 * (e.g. `pnpm --filter @gutenberg/cli` runs with cwd `apps/cli`).
 */
export function resolve_publish_folder(folder: string): string {
  if (isAbsolute(folder)) {
    return folder;
  }

  const candidates = [
    resolve(process.cwd(), folder),
    ...(process.env.INIT_CWD ? [resolve(process.env.INIT_CWD, folder)] : []),
    resolve(process.cwd(), '..', '..', folder),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return resolve(process.cwd(), folder);
}
