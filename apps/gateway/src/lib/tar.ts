/**
 * Minimal POSIX (ustar) tar reader for site bundles published by the CLI.
 *
 * The CLI uses `node-tar` with `portable: true`, producing ustar entries.
 * We only need to extract regular files; symlinks/hardlinks are explicitly
 * rejected (they were rejected at publish time too).
 */

const BLOCK_SIZE = 512;
const TYPE_FLAG_OFFSET = 156;
const NAME_OFFSET = 0;
const NAME_LENGTH = 100;
const SIZE_OFFSET = 124;
const SIZE_LENGTH = 12;
const PREFIX_OFFSET = 345;
const PREFIX_LENGTH = 155;
const MAGIC_OFFSET = 257;
const MAGIC_LENGTH = 6;

const REGULAR_TYPES = new Set(['', '0', '\0']);
const REJECTED_TYPES = new Set(['1', '2']); // hardlink, symlink

const decoder = new TextDecoder('utf-8');

/** Extract `bundle` (raw tar bytes) into a path → bytes map keyed by absolute site path. */
export function extract_tar_bundle(
  bundle: Uint8Array,
): Map<`/${string}`, Uint8Array> {
  const map = new Map<`/${string}`, Uint8Array>();
  let offset = 0;

  while (offset + BLOCK_SIZE <= bundle.byteLength) {
    const header = bundle.subarray(offset, offset + BLOCK_SIZE);

    if (is_zero_block(header)) {
      break;
    }

    const magic = decoder.decode(
      header.subarray(MAGIC_OFFSET, MAGIC_OFFSET + MAGIC_LENGTH),
    );

    if (!magic.startsWith('ustar')) {
      throw new Error('Bundle is not a POSIX ustar archive');
    }

    const type_flag = String.fromCharCode(header[TYPE_FLAG_OFFSET] ?? 0);

    if (REJECTED_TYPES.has(type_flag)) {
      throw new Error('Bundle contains a symlink or hardlink entry');
    }

    const name = read_cstring(
      header.subarray(NAME_OFFSET, NAME_OFFSET + NAME_LENGTH),
    );
    const prefix = read_cstring(
      header.subarray(PREFIX_OFFSET, PREFIX_OFFSET + PREFIX_LENGTH),
    );
    const path = prefix ? `${prefix}/${name}` : name;
    const size = read_octal(
      header.subarray(SIZE_OFFSET, SIZE_OFFSET + SIZE_LENGTH),
    );

    offset += BLOCK_SIZE;

    if (REGULAR_TYPES.has(type_flag) && !path.endsWith('/')) {
      const content_end = offset + size;

      if (content_end > bundle.byteLength) {
        throw new Error('Bundle is truncated');
      }

      const body = bundle.slice(offset, content_end);
      const normalized = normalize_site_path(path);

      map.set(normalized, body);
    }

    offset += round_up_to_block(size);
  }

  return map;
}

function is_zero_block(block: Uint8Array): boolean {
  for (let i = 0; i < block.byteLength; i++) {
    if (block[i] !== 0) {
      return false;
    }
  }

  return true;
}

function read_cstring(bytes: Uint8Array): string {
  let end = bytes.byteLength;

  for (let i = 0; i < bytes.byteLength; i++) {
    if (bytes[i] === 0) {
      end = i;
      break;
    }
  }

  return decoder.decode(bytes.subarray(0, end));
}

function read_octal(bytes: Uint8Array): number {
  const text = read_cstring(bytes).trim();

  if (text === '') {
    return 0;
  }

  const value = Number.parseInt(text, 8);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Invalid tar size field');
  }

  return value;
}

function round_up_to_block(size: number): number {
  return Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
}

function normalize_site_path(path: string): `/${string}` {
  const without_leading = path.replace(/^\/+/, '').replaceAll('\\', '/');

  if (without_leading.includes('..') || without_leading.includes('\0')) {
    throw new Error(`Bundle entry has unsafe path: ${path}`);
  }

  return `/${without_leading}`;
}
