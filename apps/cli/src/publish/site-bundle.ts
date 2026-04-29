import type { Stats } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as tar from 'tar';
import type { ReadEntry } from 'tar';

import type { SiteFile } from './site-files.types';

/** Deterministic POSIX tar of site files under `root` (one archive object in storage). */
export async function create_site_tarball(
  root: string,
  files: SiteFile[],
): Promise<Buffer> {
  const sorted = [...files].sort((a, b) =>
    a.site_path < b.site_path ? -1 : a.site_path > b.site_path ? 1 : 0,
  );
  const relative_paths = sorted.map((f) => f.site_path.slice(1));

  const staging = await mkdtemp(join(tmpdir(), 'gutenberg-tar-'));
  const tar_path = join(staging, 'bundle.tar');

  try {
    await tar.create(
      {
        cwd: root,
        file: tar_path,
        portable: true,
        noMtime: true,
        gzip: false,
      },
      relative_paths,
    );

    return await readFile(tar_path);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

/** Extract tarball bytes into a map of site paths (`/index.md`) → file contents. */
export async function extract_site_tarball(
  bundle: Buffer,
): Promise<Map<string, Buffer>> {
  const staging = await mkdtemp(join(tmpdir(), 'gutenberg-untar-'));
  const tar_path = join(staging, 'bundle.tar');
  const out_dir = join(staging, 'out');

  try {
    await mkdir(out_dir, { recursive: true });
    await writeFile(tar_path, bundle);

    await tar.extract({
      cwd: out_dir,
      file: tar_path,
      strict: true,
      filter: reject_tar_links,
    });

    const map = new Map<string, Buffer>();
    await walk_files('', out_dir, map);
    return map;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function reject_tar_links(_path: string, entry: Stats | ReadEntry): boolean {
  if ('isSymbolicLink' in entry && typeof entry.isSymbolicLink === 'function') {
    return !entry.isSymbolicLink();
  }

  if ('type' in entry && typeof entry.type === 'string') {
    return entry.type !== 'SymbolicLink' && entry.type !== 'Link';
  }

  return true;
}

async function walk_files(
  rel: string,
  abs_dir: string,
  map: Map<string, Buffer>,
): Promise<void> {
  const entries = await readdir(abs_dir, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;
    const child_abs = join(abs_dir, name);
    const child_rel = rel ? `${rel}/${name}` : name;

    if (entry.isDirectory()) {
      await walk_files(child_rel, child_abs, map);
      continue;
    }

    if (entry.isFile()) {
      const posix_rel = child_rel.replace(/\\/g, '/');
      const site_path = `/${posix_rel}`;
      map.set(site_path, await readFile(child_abs));
    }
  }
}
