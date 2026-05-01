import { base58_encode } from './base58.js';
import { bytes_equal, bytes_to_hex } from './hash.js';
import {
  ACCOUNT_DISCRIMINATOR,
  GUTENBERG_REGISTRY_PROGRAM_ID,
  find_release_address,
} from './instruction.js';
import {
  release_event_type,
  sha256_prefix,
  type ContentUri,
  type GutenbergReleaseEvent,
  type Sha256Hash,
} from './types.js';

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
  program_id?: string;
  name: string;
  version: string;
}): Promise<
  | {
      release: GutenbergReleaseEvent;
      release_address: string;
    }
  | undefined
> {
  const program_id = input.program_id ?? GUTENBERG_REGISTRY_PROGRAM_ID;
  const { address: address } = find_release_address({
    name: input.name,
    version: input.version,
    program_id,
  });

  const result = await rpc_call<{
    value: { data: [string, string] } | null;
  }>({
    rpc_url: input.rpc_url,
    method: 'getAccountInfo',
    params: [
      address,
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

  return { release, release_address: address };
}

export async function list_releases(input: {
  rpc_url: string;
  program_id?: string;
}): Promise<GutenbergReleaseEvent[]> {
  const program_id = input.program_id ?? GUTENBERG_REGISTRY_PROGRAM_ID;
  const filter_bytes_base58 = base58_encode(ACCOUNT_DISCRIMINATOR.Release);
  const result = await rpc_call<
    Array<{ pubkey: string; account: RpcAccount }>
  >({
    rpc_url: input.rpc_url,
    method: 'getProgramAccounts',
    params: [
      program_id,
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

  return events.sort((a, b) =>
    a.published_at < b.published_at ? -1 : a.published_at > b.published_at ? 1 : 0,
  );
}

export async function find_latest_release_by_name(input: {
  rpc_url: string;
  program_id?: string;
  name: string;
}): Promise<GutenbergReleaseEvent | undefined> {
  const releases = await list_releases({
    rpc_url: input.rpc_url,
    ...(input.program_id ? { program_id: input.program_id } : {}),
  });

  return releases.filter((event) => event.name === input.name).at(-1);
}

export async function fetch_name_authority(input: {
  rpc_url: string;
  program_id?: string;
  name: string;
  address: string;
}): Promise<string | undefined> {
  const result = await rpc_call<{
    value: { data: [string, string]; lamports: number } | null;
  }>({
    rpc_url: input.rpc_url,
    method: 'getAccountInfo',
    params: [
      input.address,
      { encoding: 'base64', commitment: 'confirmed' },
    ],
  });

  if (!result.value) {
    return undefined;
  }

  const data = decode_account_data(result.value.data);

  if (data.byteLength < 40) {
    return undefined;
  }

  if (!bytes_equal(data.subarray(0, 8), ACCOUNT_DISCRIMINATOR.Name)) {
    return undefined;
  }

  return base58_encode(data.subarray(8, 40));
}

export async function fetch_minimum_balance_for_rent_exemption(input: {
  rpc_url: string;
  data_length: number;
}): Promise<number> {
  return rpc_call<number>({
    rpc_url: input.rpc_url,
    method: 'getMinimumBalanceForRentExemption',
    params: [input.data_length],
  });
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

  if (!bytes_equal(discriminator, ACCOUNT_DISCRIMINATOR.Release)) {
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
  const published_at_unix = Number(reader.read_i64_le());
  reader.read_u64_le();

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
    published_at: new Date(published_at_unix * 1000).toISOString(),
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
    const bytes = this.read_bytes(1);

    if (bytes.length === 0) {
      throw new Error('read_u8: out of range');
    }

    return bytes[0]!;
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

    return new DataView(bytes.buffer, bytes.byteOffset, 8).getBigUint64(
      0,
      true,
    );
  }
}

function base64_decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
