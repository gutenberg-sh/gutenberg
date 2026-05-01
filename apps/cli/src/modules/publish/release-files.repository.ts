import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import type { ReleaseBundleFile } from '../../common/helpers/release-bundle';

@Injectable()
export class ReleaseFilesRepository {
  resolve_folder(folder: string): string {
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

  async assert_directory(path: string): Promise<string> {
    const root = resolve(path);
    const root_stat = await stat(root);

    if (!root_stat.isDirectory()) {
      throw new Error(`Publish path is not a directory: ${path}`);
    }

    return root;
  }

  async list_release_files(root: string): Promise<ReleaseBundleFile[]> {
    const files: ReleaseBundleFile[] = [];

    async function visit(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) {
          continue;
        }

        const path = resolve(dir, entry.name);

        if (entry.isDirectory()) {
          await visit(path);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        files.push({
          absolute_path: path,
          path: `/${relative(root, path).split(sep).join('/')}`,
        });
      }
    }

    await visit(root);

    return files.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    );
  }

  async read_file(path: string): Promise<Buffer> {
    return readFile(path);
  }
}
