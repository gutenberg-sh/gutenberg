/** True when the file should be unpacked as a zip bundle. */
export function is_zip_file(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    n.endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  );
}

async function read_directory_entries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const acc: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];
  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    acc.push(...batch);
  } while (batch.length > 0);
  return acc;
}

async function walk_entry(
  entry: FileSystemEntry,
  prefix: string,
  out: Map<File, string>,
): Promise<void> {
  if (entry.isFile) {
    await new Promise<void>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(
        (file) => {
          const rel = `${prefix}${file.name}`;
          out.set(file, rel);
          resolve();
        },
        () => reject(new Error('Could not read dropped file')),
      );
    });
    return;
  }

  if (!entry.isDirectory) {
    return;
  }

  const dir = entry as FileSystemDirectoryEntry;
  const next_prefix = `${prefix}${dir.name}/`;
  const reader = dir.createReader();
  const children = await read_directory_entries(reader);
  for (const child of children) {
    await walk_entry(child, next_prefix, out);
  }
}

export type CollectedBundleDrop =
  | { kind: 'zip'; file: File }
  | { kind: 'browser'; files: File[]; relative_paths: Map<File, string> | null }
  | { kind: 'reject'; message: string };

/**
 * Interprets a drag/drop as either one zip archive, a directory tree, or loose files.
 */
export async function collect_bundle_from_drop(
  dt: DataTransfer,
): Promise<CollectedBundleDrop> {
  const file_list = [...dt.files];

  if (file_list.length === 1 && is_zip_file(file_list[0]!)) {
    return { kind: 'zip', file: file_list[0]! };
  }

  const path_map = new Map<File, string>();
  const items = [...dt.items];

  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (!entry) {
      continue;
    }
    try {
      await walk_entry(entry, '', path_map);
    } catch {
      path_map.clear();
      break;
    }
  }

  if (path_map.size > 0) {
    if (path_map.size === 1) {
      const lone = [...path_map.keys()][0]!;
      if (is_zip_file(lone)) {
        return { kind: 'zip', file: lone };
      }
    }
    return {
      kind: 'browser',
      files: [...path_map.keys()],
      relative_paths: path_map,
    };
  }

  if (file_list.length > 0) {
    const zips = file_list.filter(is_zip_file);
    if (zips.length > 0 && zips.length !== file_list.length) {
      return {
        kind: 'reject',
        message:
          'Drop a zip archive on its own, or drop files and folders without mixing in a zip.',
      };
    }
    if (file_list.length === 1 && zips.length === 1) {
      return { kind: 'zip', file: zips[0]! };
    }
    return { kind: 'browser', files: file_list, relative_paths: null };
  }

  return {
    kind: 'reject',
    message: 'Drop files, a project folder, or one .zip archive.',
  };
}
