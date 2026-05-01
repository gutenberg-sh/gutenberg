import { canonical_json } from './canonical-json.js';
import { sha256_hash } from './hash.js';
import {
  assert_valid_manifest,
  strip_utf8_bom,
  verify_manifest_signature,
} from './manifest.js';
import { fetch_release_by_name_at_version } from './registry-read.js';
import { fetch_blob } from './storage.js';
import type {
  ContentUri,
  GutenbergManifest,
  GutenbergReleaseEvent,
  VerifiedFile,
  VerifiedRelease,
} from './types.js';

export type VerifyContext = {
  rpc_url: string;
  irys_gateway: string;
  arweave_mirrors: readonly string[];
  program_id: string;
};

export async function resolve_release(
  input: { name: string; version: string },
  ctx: VerifyContext,
): Promise<{ release: GutenbergReleaseEvent; release_address: string }> {
  const found = await fetch_release_by_name_at_version({
    rpc_url: ctx.rpc_url,
    program_id: ctx.program_id,
    name: input.name,
    version: input.version,
  });

  if (!found) {
    throw new Error(`No release found for ${input.name}@${input.version}`);
  }

  return found;
}

export async function verify_manifest_uri(input: {
  expected_release: GutenbergReleaseEvent;
  ctx: VerifyContext;
}): Promise<{ manifest: GutenbergManifest }> {
  const manifest_bytes = await fetch_blob(
    input.expected_release.manifest,
    input.ctx.irys_gateway,
    input.ctx.arweave_mirrors,
    (bytes) => {
      const text = strip_utf8_bom(new TextDecoder('utf-8').decode(bytes));
      let candidate: unknown;

      try {
        candidate = JSON.parse(text);
      } catch {
        return 'not valid JSON';
      }

      let canonical: string;

      try {
        canonical = canonical_json(candidate);
      } catch {
        return 'manifest is not canonicalizable';
      }

      const hash = sha256_hash(canonical);

      if (hash !== input.expected_release.manifest_hash) {
        return 'manifest hash does not match the registered release';
      }

      return true;
    },
  );

  const parsed: unknown = JSON.parse(
    strip_utf8_bom(new TextDecoder('utf-8').decode(manifest_bytes)),
  );

  assert_valid_manifest(parsed);

  if (!verify_manifest_signature(parsed)) {
    throw new Error('Manifest signature verification failed');
  }

  if (
    parsed.publisher !== input.expected_release.publisher ||
    parsed.name !== input.expected_release.name ||
    parsed.version !== input.expected_release.version
  ) {
    throw new Error('Manifest does not match the registered release');
  }

  if (parsed.chain.program_id !== input.ctx.program_id) {
    throw new Error(
      'Manifest chain.program_id does not match the gateway-configured program',
    );
  }

  const files_canonical = canonical_json(parsed.files);
  const expected_content_hash = sha256_hash(files_canonical);

  if (expected_content_hash !== parsed.content_hash) {
    throw new Error('Manifest content_hash does not match files digest');
  }

  if (parsed.content_hash !== input.expected_release.content_hash) {
    throw new Error(
      'Manifest content_hash does not match the on-chain content_hash',
    );
  }

  if (parsed.content_size_bytes !== input.expected_release.content_size_bytes) {
    throw new Error(
      'Manifest content_size_bytes does not match the on-chain content_size_bytes',
    );
  }

  return { manifest: parsed };
}

export function build_file_index(
  manifest: GutenbergManifest,
): ReadonlyMap<`/${string}`, VerifiedFile> {
  const map = new Map<`/${string}`, VerifiedFile>();

  for (const [path, file] of Object.entries(manifest.files)) {
    const entry: VerifiedFile = {
      hash: file.hash,
      size_bytes: file.size_bytes,
      uri: file.uri,
      ...(file.mime ? { mime: file.mime } : {}),
    };
    map.set(path as `/${string}`, entry);
  }

  return map;
}

export async function load_file_bytes(input: {
  uri: ContentUri;
  expected_hash: VerifiedFile['hash'];
  expected_size_bytes: number;
  ctx: VerifyContext;
}): Promise<Uint8Array> {
  return fetch_blob(
    input.uri,
    input.ctx.irys_gateway,
    input.ctx.arweave_mirrors,
    (bytes) => {
      if (bytes.byteLength !== input.expected_size_bytes) {
        return `size mismatch (expected ${input.expected_size_bytes}, got ${bytes.byteLength})`;
      }

      const actual_hash = sha256_hash(bytes);

      if (actual_hash !== input.expected_hash) {
        return 'file hash does not match manifest';
      }

      return true;
    },
  );
}

export function assemble_verified_release(input: {
  release: GutenbergReleaseEvent;
  release_address: string;
  manifest: GutenbergManifest;
}): VerifiedRelease {
  return {
    manifest: input.manifest,
    manifest_uri: input.release.manifest,
    release: input.release,
    release_address: input.release_address,
    files: build_file_index(input.manifest),
  };
}
