import { unzipSync } from 'fflate';

import { guess_mime_for_path, type PublishSessionFile } from '@gutenberg/core';

const SKIP_TOP_SEGMENTS = new Set(['__MACOSX', '.git', 'node_modules']);

function uint8_to_base64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary);
}

function segments_from_relative_path(relative: string): string[] {
  const norm = relative.replace(/\\/g, '/').replace(/^\/+/, '');
  return norm.split('/').filter(Boolean);
}

function should_skip_segments(segments: string[]): boolean {
  return segments.some(
    (s) =>
      s === '.' ||
      s === '..' ||
      s.startsWith('.') ||
      SKIP_TOP_SEGMENTS.has(s),
  );
}

function to_publish_path(segments: string[]): `/${string}` {
  if (segments.some((s) => s === '..' || s.includes('\\'))) {
    throw new Error('Invalid path in archive');
  }

  return `/${segments.join('/')}`;
}

/**
 * Directory picker paths include the selected folder as the first segment
 * (`my-app/index.md`). Strip that uniform root so the bundle matches on-disk layout
 * (`/index.md` at bundle root).
 */
function strip_uniform_directory_prefix(segments_list: string[][]): string[][] {
  if (segments_list.length === 0) {
    return segments_list;
  }

  const first_row = segments_list[0];
  if (!first_row) {
    return segments_list;
  }

  const root = first_row[0];
  if (!root) {
    return segments_list;
  }

  const strip = segments_list.every(
    (segs) => segs.length >= 2 && segs[0] === root,
  );

  if (!strip) {
    return segments_list;
  }

  return segments_list.map((segs) => segs.slice(1));
}

export type BrowserPackMode = 'folder' | 'files' | 'zip';

/**
 * Turns a directory or loose file selection into session file rows.
 * Skips dotfiles and common junk folders (aligned with the prior release packer).
 */
export async function pack_browser_file_selection(input: {
  mode: Exclude<BrowserPackMode, 'zip'>;
  files: File[];
}): Promise<PublishSessionFile[]> {
  const { mode, files } = input;

  if (files.length === 0) {
    return [];
  }

  const by_path = new Map<`/${string}`, PublishSessionFile>();

  const pending: { file: File; segments: string[] }[] = [];

  for (const file of files) {
    let segments: string[];

    if (mode === 'folder' && file.webkitRelativePath) {
      segments = segments_from_relative_path(file.webkitRelativePath);
    } else {
      segments = segments_from_relative_path(file.name);
    }

    if (segments.length === 0 || should_skip_segments(segments)) {
      continue;
    }

    pending.push({ file, segments });
  }

  const normalized_segments =
    mode === 'folder'
      ? strip_uniform_directory_prefix(pending.map((p) => p.segments))
      : pending.map((p) => p.segments);

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i]!;
    const { file } = row;
    const segments = normalized_segments[i]!;

    if (segments.length === 0 || should_skip_segments(segments)) {
      continue;
    }

    const path = to_publish_path(segments);
    if (by_path.has(path)) {
      throw new Error(`Duplicate path in selection: ${path}`);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = guess_mime_for_path(path);

    by_path.set(path, {
      path,
      size_bytes: bytes.byteLength,
      ...(mime ? { mime } : {}),
      content_base64: uint8_to_base64(bytes),
    });
  }

  return [...by_path.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, row]) => row);
}

/**
 * Synchronously unpacks a zip into session rows (paths normalized, unsafe segments rejected).
 */
export function pack_zip_bytes(zip_bytes: Uint8Array): PublishSessionFile[] {
  const entries = unzipSync(zip_bytes);
  const pending: {
    segments: string[];
    data: Uint8Array;
  }[] = [];

  for (const raw_key of Object.keys(entries)) {
    if (!raw_key || raw_key.endsWith('/')) {
      continue;
    }

    const segments = segments_from_relative_path(raw_key);

    if (segments.length === 0 || should_skip_segments(segments)) {
      continue;
    }

    const data = entries[raw_key];

    if (!data || data.byteLength === 0) {
      continue;
    }

    pending.push({ segments, data });
  }

  const normalized_segments = strip_uniform_directory_prefix(
    pending.map((p) => p.segments),
  );

  const by_path = new Map<`/${string}`, PublishSessionFile>();

  for (let i = 0; i < pending.length; i++) {
    const segments = normalized_segments[i]!;
    const data = pending[i]!.data;

    if (segments.length === 0 || should_skip_segments(segments)) {
      continue;
    }

    const path = to_publish_path(segments);

    if (by_path.has(path)) {
      throw new Error(`Duplicate path in archive: ${path}`);
    }

    const mime = guess_mime_for_path(path);

    by_path.set(path, {
      path,
      size_bytes: data.byteLength,
      ...(mime ? { mime } : {}),
      content_base64: uint8_to_base64(data),
    });
  }

  if (by_path.size === 0) {
    throw new Error('This zip did not contain any usable files');
  }

  return [...by_path.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, row]) => row);
}

export async function pack_zip_file(file: File): Promise<PublishSessionFile[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  return pack_zip_bytes(buf);
}
