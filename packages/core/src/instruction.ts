import { base58_decode, base58_encode } from './base58.js';
import { is_on_curve } from './ed25519.js';
import { concat_bytes, sha256 } from './hash.js';
import { sha256_prefix, type Sha256Hash } from './types.js';

export const GUTENBERG_REGISTRY_PROGRAM_ID =
  'NRrK71RxAHpt5CdLUWgRzTuzMopnRBnEqCiCku6J517';

// Account sizes mirror `Release::SPACE` / `NameAuthority::SPACE` in
// apps/solana/programs/gutenberg_registry/src/state.rs.
export const RELEASE_ACCOUNT_SPACE =
  8 + 1 + 32 + (4 + 64) + (4 + 32) + (4 + 512) + 32 + 32 + 8 + 8 + 8;
export const NAME_AUTHORITY_ACCOUNT_SPACE = 8 + 32;

// Solana charges 5000 lamports per signature; publish_release has exactly one.
export const PUBLISH_BASE_FEE_LAMPORTS = 5000;

const RELEASE_SEED = new TextEncoder().encode('release');
const NAME_SEED = new TextEncoder().encode('name');
const PDA_MARKER = new TextEncoder().encode('ProgramDerivedAddress');

export type PublishReleaseInstructionInput = {
  name: string;
  version: string;
  manifest_uri: string;
  manifest_hash: Sha256Hash;
  content_hash: Sha256Hash;
  content_size_bytes: number;
};

export function encode_publish_release_instruction(
  input: PublishReleaseInstructionInput,
): Uint8Array {
  return concat_bytes(
    instruction_discriminator('publish_release'),
    encode_string(input.name),
    encode_string(input.version),
    encode_string(input.manifest_uri),
    sha256_string_to_raw(input.manifest_hash),
    sha256_string_to_raw(input.content_hash),
    encode_u64_le(input.content_size_bytes),
    seed_hash(input.name),
    seed_hash(input.version),
  );
}

export function find_release_pda(input: {
  name: string;
  version: string;
  program_id?: string;
}): { address: string; bump: number } {
  const program_id = input.program_id ?? GUTENBERG_REGISTRY_PROGRAM_ID;

  return find_program_address(
    [RELEASE_SEED, seed_hash(input.name), seed_hash(input.version)],
    program_id,
  );
}

export function find_name_authority_pda(input: {
  name: string;
  program_id?: string;
}): { address: string; bump: number } {
  const program_id = input.program_id ?? GUTENBERG_REGISTRY_PROGRAM_ID;

  return find_program_address(
    [NAME_SEED, seed_hash(input.name)],
    program_id,
  );
}

export function release_address(input: {
  name: string;
  version: string;
  program_id?: string;
}): string {
  return find_release_pda(input).address;
}

export function name_authority_address(input: {
  name: string;
  program_id?: string;
}): string {
  return find_name_authority_pda(input).address;
}

export const ACCOUNT_DISCRIMINATOR = {
  Release: account_discriminator('Release'),
  NameAuthority: account_discriminator('NameAuthority'),
} as const;

function find_program_address(
  seeds: readonly Uint8Array[],
  program_id: string,
): { address: string; bump: number } {
  const program_bytes = base58_decode(program_id);

  for (let bump = 255; bump >= 0; bump--) {
    const buffer = concat_bytes(
      ...seeds,
      Uint8Array.of(bump),
      program_bytes,
      PDA_MARKER,
    );
    const candidate = sha256(buffer);

    if (!is_on_curve(candidate)) {
      return { address: base58_encode(candidate), bump };
    }
  }

  throw new Error('Unable to derive program-derived address');
}

function instruction_discriminator(name: string): Uint8Array {
  return sha256(new TextEncoder().encode(`global:${name}`)).subarray(0, 8);
}

function account_discriminator(name: string): Uint8Array {
  return sha256(new TextEncoder().encode(`account:${name}`)).subarray(0, 8);
}

function seed_hash(value: string): Uint8Array {
  return sha256(new TextEncoder().encode(value));
}

function encode_string(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, bytes.byteLength, true);

  return concat_bytes(length, bytes);
}

function encode_u64_le(value: number): Uint8Array {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error('u64 must be a non-negative integer');
  }

  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(value), true);

  return out;
}

function sha256_string_to_raw(hash: Sha256Hash): Uint8Array {
  const hex = hash.startsWith(sha256_prefix)
    ? hash.slice(sha256_prefix.length)
    : hash;

  if (hex.length !== 64) {
    throw new Error('sha256 hash must be 64 hex characters');
  }

  const out = new Uint8Array(32);

  for (let i = 0; i < 32; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return out;
}
