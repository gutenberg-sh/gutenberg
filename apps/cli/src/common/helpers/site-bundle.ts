import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as tar from 'tar';

export type SiteBundleFile = {
  absolute_path: string;
  site_path: `/${string}`;
};

export async function create_site_tarball(
  root: string,
  files: SiteBundleFile[],
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
