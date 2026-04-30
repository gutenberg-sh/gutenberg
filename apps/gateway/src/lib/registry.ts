import { sha256 as noble_sha256 } from '@noble/hashes/sha2';

import { base58_decode, base58_encode } from './base58';
import { is_on_curve } from './ed25519';
import { bytes_equal, bytes_to_hex } from './hash';
import {
  release_event_type,
  sha256_prefix,
  type GutenbergReleaseEvent,
} from './types';

const PDA_MARKER = new TextEncoder().encode('ProgramDerivedAddress');
const RELEASE_SEED = new TextEncoder().encode('release');
const ACCOUNT_DISCRIMINATOR_RELEASE = sync_sha256(
  new TextEncoder().encode('account:Release'),
).subarray(0, 8);

type RpcAccount = {
  data: string;
  encoding: string;
};

type RpcResponse<T> = {
  jsonrpc: '2.0';
  id: number;
  error?: { code: number; message: string };
  result: T;
};

let request_id = 0;

export function find_release_pda(input: {
  publisher: string;
  name: string;
  version: string;
  program_id: string;
}): string {
  const program_bytes = base58_decode(input.program_id);
  const publisher_bytes = base58_decode(input.publisher);
  const name_seed = sync_sha256(new TextEncoder().encode(input.name));
  const version_seed = sync_sha256(new TextEncoder().encode(input.version));

  for (let bump = 255; bump >= 0; bump--) {
    const buffer = concat_bytes(
      RELEASE_SEED,
      publisher_bytes,
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

/**
 * Fetch + decode the registry's `Release` account at the given PDA.
 * Returns `undefined` if the account does not exist.
 */
export async function fetch_release(
  release_pda: string,
  rpc_url: string,
): Promise<GutenbergReleaseEvent | undefined> {
  const account = await get_account_info(release_pda, rpc_url);

  if (!account) {
    return undefined;
  }

  return decode_release_account(account);
}

/**
 * Scan all release accounts under `program_id` (via `getProgramAccounts`).
 * Some public RPCs disable this method; if you know the publisher, prefer
 * deriving the PDA directly via `find_release_pda` + `fetch_release`.
 */
export async function list_releases(input: {
  rpc_url: string;
  program_id: string;
}): Promise<GutenbergReleaseEvent[]> {
  const id = ++request_id;
  const filter_bytes_base58 = base58_encode(ACCOUNT_DISCRIMINATOR_RELEASE);
  const response = await fetch(input.rpc_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'getProgramAccounts',
      params: [
        input.program_id,
        {
          encoding: 'base64',
          commitment: 'confirmed',
          filters: [
            { memcmp: { offset: 0, bytes: filter_bytes_base58 } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Solana RPC ${input.rpc_url} returned ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as RpcResponse<
    Array<{ pubkey: string; account: RpcAccount }>
  >;

  if (body.error) {
    throw new Error(`Solana RPC error: ${body.error.message}`);
  }

  const events: GutenbergReleaseEvent[] = [];

  for (const entry of body.result) {
    if (entry.account.encoding !== 'base64') {
      continue;
    }

    try {
      events.push(decode_release_account(base64_decode(entry.account.data)));
    } catch {
      // skip accounts we can't decode
    }
  }

  return events.sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}

/** Find the most-recent release matching `name` (and optional version). */
export async function find_latest_release_by_name(input: {
  rpc_url: string;
  program_id: string;
  name: string;
  version?: string;
}): Promise<GutenbergReleaseEvent | undefined> {
  const releases = await list_releases({
    rpc_url: input.rpc_url,
    program_id: input.program_id,
  });

  return releases
    .filter(
      (event) =>
        event.name === input.name &&
        (input.version === undefined || event.version === input.version),
    )
    .at(-1);
}

async function get_account_info(
  address: string,
  rpc_url: string,
): Promise<Uint8Array | undefined> {
  const id = ++request_id;
  const response = await fetch(rpc_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'getAccountInfo',
      params: [address, { encoding: 'base64', commitment: 'confirmed' }],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Solana RPC ${rpc_url} returned ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as RpcResponse<{
    value: RpcAccount | null;
  }>;

  if (body.error) {
    throw new Error(`Solana RPC error: ${body.error.message}`);
  }

  const value = body.result.value;

  if (!value) {
    return undefined;
  }

  if (value.encoding !== 'base64') {
    throw new Error(`Unexpected RPC encoding: ${value.encoding}`);
  }

  return base64_decode(value.data);
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
  const publisher_bytes = reader.read_bytes(32);
  const name = reader.read_string();
  const version = reader.read_string();
  const manifest = reader.read_string();
  const manifest_hash_raw = reader.read_bytes(32);
  const created_at_unix = reader.read_i64_le();

  return {
    type: release_event_type,
    name,
    version,
    manifest,
    manifest_hash: `${sha256_prefix}${bytes_to_hex(manifest_hash_raw)}`,
    publisher: base58_encode(publisher_bytes),
    created_at: new Date(Number(created_at_unix) * 1000).toISOString(),
  };
}

class AccountReader {
  readonly data: Uint8Array;
  private offset: number;

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

/** Synchronous sha256 (via @noble/hashes) — needed for PDA derivation in a tight loop. */
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
