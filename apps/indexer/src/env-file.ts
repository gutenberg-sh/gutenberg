import { config as load_dotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

function monorepo_root(): string {
  let dir = __dirname;
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('Could not find monorepo root (pnpm-workspace.yaml)');
    }
    dir = parent;
  }
}

export function resolve_env_file_path(): string | undefined {
  const path = join(monorepo_root(), '.env');
  return existsSync(path) ? path : undefined;
}

export function load_env_file(): void {
  const path = resolve_env_file_path();
  if (path) {
    load_dotenv({ path, quiet: true });
  }
}
