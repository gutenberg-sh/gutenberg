import { Injectable } from '@nestjs/common';
import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

import type { SiteFile } from './site-files.types';

@Injectable()
export class SiteFilesRepository {
  async assert_directory(path: string): Promise<string> {
    const root = resolve(path);
    const root_stat = await stat(root);

    if (!root_stat.isDirectory()) {
      throw new Error(`Publish path is not a directory: ${path}`);
    }

    return root;
  }

  async list_site_files(root: string): Promise<SiteFile[]> {
    const files: SiteFile[] = [];

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
          site_path: `/${relative(root, path).split(sep).join('/')}`,
        });
      }
    }

    await visit(root);

    return files.sort((a, b) =>
      a.site_path < b.site_path ? -1 : a.site_path > b.site_path ? 1 : 0,
    );
  }

  async read_file(path: string): Promise<Buffer> {
    return readFile(path);
  }
}
