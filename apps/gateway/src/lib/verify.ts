import { canonical_json } from './canonical-json';
import { sha256_hash } from './hash';
import {
  assert_valid_manifest,
  strip_utf8_bom,
  verify_manifest_signature,
} from './manifest';
import {
  fetch_release,
  find_latest_release_by_name,
  find_release_pda,
} from './registry';
import { fetch_blob } from './storage';
import { extract_tar_bundle } from './tar';
import type {
  GutenbergManifest,
  GutenbergReleaseEvent,
  VerifiedRelease,
} from './types';

export type VerifyContext = {
  rpc_url: string;
  arweave_gateway: string;
  program_id: string;
};

export type ResolveByNameInput = {
  name: string;
  version?: string;
  publisher?: string;
};

/** Resolve a release by name (and optional version/publisher) to a registry event. */
export async function resolve_release_event(
  input: ResolveByNameInput,
  ctx: VerifyContext,
): Promise<{ release: GutenbergReleaseEvent; release_pda: string }> {
  if (input.publisher && input.version) {
    const pda = find_release_pda({
      publisher: input.publisher,
      name: input.name,
      version: input.version,
      program_id: ctx.program_id,
    });
    const event = await fetch_release(pda, ctx.rpc_url);

    if (!event) {
      throw new Error(
        `No release found for ${input.name}@${input.version} from ${input.publisher}`,
      );
    }

    return { release: event, release_pda: pda };
  }

  const event = await find_latest_release_by_name({
    rpc_url: ctx.rpc_url,
    program_id: ctx.program_id,
    name: input.name,
    version: input.version,
  });

  if (!event) {
    throw new Error(
      input.version
        ? `No release found for ${input.name}@${input.version}`
        : `No release found for ${input.name}`,
    );
  }

  const pda = find_release_pda({
    publisher: event.publisher,
    name: event.name,
    version: event.version,
    program_id: ctx.program_id,
  });

  return { release: event, release_pda: pda };
}

/** Fetch + verify a manifest by its content URI, optionally bound to a registry event. */
export async function verify_manifest_uri(input: {
  manifest_uri: string;
  expected_release?: GutenbergReleaseEvent;
  ctx: VerifyContext;
}): Promise<{ manifest: GutenbergManifest }> {
  const manifest_bytes = await fetch_blob(
    input.manifest_uri,
    input.ctx.arweave_gateway,
  );
  const manifest_text = strip_utf8_bom(
    new TextDecoder('utf-8').decode(manifest_bytes),
  );
  let parsed: unknown;

  try {
    parsed = JSON.parse(manifest_text);
  } catch {
    throw new Error('Manifest is not valid JSON');
  }

  if (input.expected_release) {
    let canonical: string;

    try {
      canonical = canonical_json(parsed);
    } catch {
      throw new Error('Manifest hash does not match the registered release');
    }

    const hash = await sha256_hash(canonical);

    if (hash !== input.expected_release.manifest_hash) {
      throw new Error('Manifest hash does not match the registered release');
    }
  }

  assert_valid_manifest(parsed);

  if (!verify_manifest_signature(parsed)) {
    throw new Error('Manifest signature verification failed');
  }

  if (input.expected_release) {
    if (
      parsed.publisher !== input.expected_release.publisher ||
      parsed.name !== input.expected_release.name ||
      parsed.version !== input.expected_release.version
    ) {
      throw new Error('Manifest does not match the registered release');
    }
  }

  return { manifest: parsed };
}

/** Fetch + verify the bundle referenced by a verified manifest. */
export async function verify_bundle(input: {
  manifest: GutenbergManifest;
  ctx: VerifyContext;
}): Promise<VerifiedRelease['files']> {
  const bundle_bytes = await fetch_blob(
    input.manifest.bundle_uri,
    input.ctx.arweave_gateway,
  );
  const bundle_hash = await sha256_hash(bundle_bytes);

  if (bundle_hash !== input.manifest.bundle_hash) {
    throw new Error('Site bundle hash does not match manifest bundle_hash');
  }

  const extracted = extract_tar_bundle(bundle_bytes);
  const files: VerifiedRelease['files'] = new Map();

  for (const [path, file] of Object.entries(input.manifest.files)) {
    const bytes = extracted.get(path as `/${string}`);

    if (!bytes) {
      throw new Error(`Missing path ${path} in site bundle`);
    }

    const file_hash = await sha256_hash(bytes);

    if (file_hash !== file.hash) {
      throw new Error(`File hash verification failed for ${path}`);
    }

    files.set(path as `/${string}`, bytes);
  }

  return files;
}
