import { sha256 as noble_sha256 } from '@noble/hashes/sha2';

import { base58_decode, base58_encode } from './base58';
import { is_on_curve } from './ed25519';
import { bytes_to_hex } from './hash';
import {
  release_event_type,
  sha256_prefix,
  type ContentUri,
  type GutenbergReleaseEvent,
  type Sha256Hash,
} from './types';

const PDA_MARKER = new TextEncoder().encode('ProgramDerivedAddress');
const RELEASE_SEED = new TextEncoder().encode('release');
const ACCOUNT_DISCRIMINATOR_RELEASE = sync_sha256(
  new TextEncoder().encode('account:Release'),
).subarray(0, 8);

type RpcAccount = {
  data: [string, string];
  executable?: boolean;
  lamports?: number;
  owner?: string;
};

type RpcResponse<T> = {
  jsonrpc: '2.0';
  id: number;
  error?: { code: number; message: string };
  result: T;
};

let request_id = 0;

export function find_release_pda(input: {
  name: string;
  version: string;
  program_id: string;
}): string {
  const program_bytes = base58_decode(input.program_id);
  const name_seed = sync_sha256(new TextEncoder().encode(input.name));
  const version_seed = sync_sha256(new TextEncoder().encode(input.version));

  for (let bump = 255; bump >= 0; bump--) {
    const buffer = concat_bytes(
      RELEASE_SEED,
      name_seed,
      version_seed,
      Uint8Array.of(bump),
      program_bytes,
      PDA_MARKER,
    );
    const hash = sync_sha256(buffer);

    if (!is_on_curve(hash)) {
      return base58_encode(hash);
    }
  }

  throw new Error('Unable to derive release PDA');
}

async function rpc_call<T>(input: {
  rpc_url: string;
  method: string;
  params: unknown[];
}): Promise<T> {
  const id = ++request_id;
  const response = await fetch(input.rpc_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: input.method,
      params: input.params,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Solana RPC ${input.rpc_url} returned ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as RpcResponse<T>;

  if (body.error) {
    throw new Error(`Solana RPC error: ${body.error.message}`);
  }

  return body.result;
}

export async function fetch_release_by_name_at_version(input: {
  rpc_url: string;
  program_id: string;
  name: string;
  version: string;
}): Promise<{
  release: GutenbergReleaseEvent;
  release_pda: string;
} | undefined> {
  const release_pda = find_release_pda({
    name: input.name,
    version: input.version,
    program_id: input.program_id,
  });

  const result = await rpc_call<{
    value: { data: [string, string] } | null;
  }>({
    rpc_url: input.rpc_url,
    method: 'getAccountInfo',
    params: [
      release_pda,
      {
        encoding: 'base64',
        commitment: 'confirmed',
      },
    ],
  });

  if (!result.value) {
    return undefined;
  }

  const data = decode_account_data(result.value.data);
  const release = decode_release_account(data);

  return { release, release_pda };
}

export async function list_releases(input: {
  rpc_url: string;
  program_id: string;
}): Promise<GutenbergReleaseEvent[]> {
  const filter_bytes_base58 = base58_encode(ACCOUNT_DISCRIMINATOR_RELEASE);
  const result = await rpc_call<
    Array<{ pubkey: string; account: RpcAccount }>
  >({
    rpc_url: input.rpc_url,
    method: 'getProgramAccounts',
    params: [
      input.program_id,
      {
        encoding: 'base64',
        commitment: 'confirmed',
        filters: [{ memcmp: { offset: 0, bytes: filter_bytes_base58 } }],
      },
    ],
  });

  const events: GutenbergReleaseEvent[] = [];

  for (const entry of result) {
    try {
      events.push(
        decode_release_account(decode_account_data(entry.account.data)),
      );
    } catch {
      /* noop */
    }
  }

  return events.sort((a, b) => a.created_at_slot - b.created_at_slot);
}

export async function find_latest_release_by_name(input: {
  rpc_url: string;
  program_id: string;
  name: string;
}): Promise<GutenbergReleaseEvent | undefined> {
  const releases = await list_releases({
    rpc_url: input.rpc_url,
    program_id: input.program_id,
  });

  return releases.filter((event) => event.name === input.name).at(-1);
}

function decode_account_data(data: RpcAccount['data']): Uint8Array {
  const [content, encoding] = data;

  if (encoding !== 'base64') {
    throw new Error(`Unexpected RPC encoding: ${encoding}`);
  }

  return base64_decode(content);
}

function decode_release_account(data: Uint8Array): GutenbergReleaseEvent {
  if (data.byteLength < 8) {
    throw new Error('Release account is truncated');
  }

  const discriminator = data.subarray(0, 8);

  if (!bytes_equal(discriminator, ACCOUNT_DISCRIMINATOR_RELEASE)) {
    throw new Error('Invalid Solana release account discriminator');
  }

  const reader = new AccountReader(data, 8);
  const schema_version = reader.read_u8();
  const publisher_bytes = reader.read_bytes(32);
  const name = reader.read_string();
  const version = reader.read_string();
  const manifest = reader.read_string();
  const manifest_hash_raw = reader.read_bytes(32);
  const content_hash_raw = reader.read_bytes(32);
  const content_size_bytes = Number(reader.read_u64_le());
  const created_at_unix = Number(reader.read_i64_le());
  const created_at_slot = Number(reader.read_u64_le());

  return {
    type: release_event_type,
    schema_version,
    publisher: base58_encode(publisher_bytes),
    name,
    version,
    manifest: manifest as ContentUri,
    manifest_hash: prefixed_sha256(manifest_hash_raw),
    content_hash: prefixed_sha256(content_hash_raw),
    content_size_bytes,
    created_at: new Date(created_at_unix * 1000).toISOString(),
    created_at_slot,
  };
}

function prefixed_sha256(bytes: Uint8Array): Sha256Hash {
  return `${sha256_prefix}${bytes_to_hex(bytes)}`;
}

class AccountReader {
  private offset: number;
  private readonly data: Uint8Array;

  constructor(data: Uint8Array, start: number) {
    this.data = data;
    this.offset = start;
  }

  read_bytes(length: number): Uint8Array {
    const next = this.offset + length;

    if (next > this.data.byteLength) {
      throw new Error('Solana release account is truncated');
    }

    const value = this.data.subarray(this.offset, next);
    this.offset = next;

    return value;
  }

  read_u8(): number {
    return this.read_bytes(1)[0]!;
  }

  read_string(): string {
    const length_bytes = this.read_bytes(4);
    const length = new DataView(
      length_bytes.buffer,
      length_bytes.byteOffset,
      4,
    ).getUint32(0, true);

    return new TextDecoder('utf-8').decode(this.read_bytes(length));
  }

  read_i64_le(): bigint {
    const bytes = this.read_bytes(8);

    return new DataView(bytes.buffer, bytes.byteOffset, 8).getBigInt64(0, true);
  }

  read_u64_le(): bigint {
    const bytes = this.read_bytes(8);

    return new DataView(bytes.buffer, bytes.byteOffset, 8).getBigUint64(0, true);
  }
}

function bytes_equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

function concat_bytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;

  for (const part of parts) {
    total += part.byteLength;
  }

  const out = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }

  return out;
}

function sync_sha256(data: Uint8Array): Uint8Array {
  return noble_sha256(data);
}

function base64_decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
