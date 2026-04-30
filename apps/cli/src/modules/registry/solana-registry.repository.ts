import { Injectable } from '@nestjs/common';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { createHash } from 'node:crypto';

import {
  sha256_prefix,
  type SolanaPublicKey,
} from '../../common/types/manifest.types';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

import {
  release_event_type,
  type FindReleaseInput,
  type GutenbergReleaseEvent,
  type HasReleaseInput,
} from './registry.types';

export const GUTENBERG_REGISTRY_PROGRAM_ID =
  'NRrK71RxAHpt5CdLUWgRzTuzMopnRBnEqCiCku6J517';

export type PublishReleaseInput = {
  name: string;
  version: string;
  manifest_uri: string;
  manifest_hash: GutenbergReleaseEvent['manifest_hash'];
  content_hash: GutenbergReleaseEvent['content_hash'];
  content_size_bytes: number;
};

@Injectable()
export class SolanaRegistryRepository {
  constructor(
    private readonly connection: Connection,
    private readonly wallet_repository: SolanaWalletRepository,
  ) {}

  program_id(): PublicKey {
    return new PublicKey(GUTENBERG_REGISTRY_PROGRAM_ID);
  }

  async assert_name_claimable(input: {
    name: string;
    publisher: SolanaPublicKey;
  }): Promise<void> {
    const addr = this.name_authority_address(input.name);
    const account = await this.connection.getAccountInfo(addr);

    if (!account) {
      return;
    }

    const authority = decode_name_authority_account(account.data);

    if (!authority) {
      return;
    }

    if (authority.toBase58() !== input.publisher) {
      throw new Error(
        `Release name "${input.name}" is already claimed by publisher ${authority.toBase58()}`,
      );
    }
  }

  async get_wallet_balance(): Promise<{ public_key: PublicKey; sol: number }> {
    const wallet = await this.wallet_repository.load_keypair();
    const balance = await this.connection.getBalance(wallet.publicKey);

    return {
      public_key: wallet.publicKey,
      sol: balance / LAMPORTS_PER_SOL,
    };
  }

  async check_rpc_connection(): Promise<string> {
    const version = await this.connection.getVersion();

    return version['solana-core'];
  }

  async publish_release(input: PublishReleaseInput): Promise<void> {
    const wallet = await this.wallet_repository.load_keypair();
    const transaction = new Transaction().add(
      this.create_publish_instruction(wallet.publicKey, input),
    );

    await sendAndConfirmTransaction(this.connection, transaction, [wallet], {
      commitment: 'confirmed',
    });
  }

  async list_releases(): Promise<GutenbergReleaseEvent[]> {
    const accounts = await this.connection.getProgramAccounts(
      this.program_id(),
      {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: account_discriminator_b58('Release'),
            },
          },
        ],
      },
    );

    return accounts
      .flatMap(({ account }) => decode_release_account_safe(account.data))
      .sort(compare_release_events);
  }

  async find_release(
    input: FindReleaseInput,
  ): Promise<GutenbergReleaseEvent | undefined> {
    if (input.version) {
      const account = await this.connection.getAccountInfo(
        this.release_address({ name: input.name, version: input.version }),
      );

      if (!account) {
        return undefined;
      }

      return decode_release_account(account.data);
    }

    const releases = await this.list_releases();

    return releases.filter((event) => event.name === input.name).at(-1);
  }

  async has_release(input: HasReleaseInput): Promise<boolean> {
    const release_address = this.release_address(input);

    return (await this.connection.getAccountInfo(release_address)) !== null;
  }

  release_address(input: { name: string; version: string }): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from('release'), seed_hash(input.name), seed_hash(input.version)],
      this.program_id(),
    );

    return address;
  }

  private create_publish_instruction(
    publisher: PublicKey,
    input: PublishReleaseInput,
  ): TransactionInstruction {
    return new TransactionInstruction({
      programId: this.program_id(),
      keys: [
        { pubkey: publisher, isSigner: true, isWritable: true },
        {
          pubkey: this.name_authority_address(input.name),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: this.release_address({
            name: input.name,
            version: input.version,
          }),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: encode_publish_release_instruction(input),
    });
  }

  private name_authority_address(name: string): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from('name'), seed_hash(name)],
      this.program_id(),
    );

    return address;
  }
}

function encode_publish_release_instruction(input: PublishReleaseInput): Buffer {
  return Buffer.concat([
    instruction_discriminator('publish_release'),
    encode_string(input.name),
    encode_string(input.version),
    encode_string(input.manifest_uri),
    sha256_string_to_raw(input.manifest_hash),
    sha256_string_to_raw(input.content_hash),
    encode_u64_le(input.content_size_bytes),
    seed_hash(input.name),
    seed_hash(input.version),
  ]);
}

function sha256_string_to_raw(hash: `sha256:${string}`): Buffer {
  const hex = hash.startsWith(sha256_prefix)
    ? hash.slice(sha256_prefix.length)
    : hash;
  const raw = Buffer.from(hex, 'hex');

  if (raw.byteLength !== 32) {
    throw new Error('sha256 hash must serialize to 32 bytes');
  }

  return raw;
}

function encode_u64_le(value: number): Buffer {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error('u64 must be a non-negative integer');
  }

  const out = Buffer.allocUnsafe(8);
  out.writeBigUInt64LE(BigInt(value), 0);

  return out;
}

function decode_name_authority_account(data: Buffer): PublicKey | undefined {
  if (data.byteLength < 40) {
    return undefined;
  }

  if (
    !data.subarray(0, 8).equals(account_discriminator_bytes('NameAuthority'))
  ) {
    return undefined;
  }

  return new PublicKey(data.subarray(8, 40));
}

function decode_release_account(data: Buffer): GutenbergReleaseEvent {
  const reader = new AccountReader(data);
  const discriminator = reader.read_bytes(8);

  if (!discriminator.equals(account_discriminator_bytes('Release'))) {
    throw new Error('Invalid Solana release account discriminator');
  }

  const schema_version = reader.read_u8();
  const publisher = new PublicKey(reader.read_bytes(32)).toBase58();
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
    publisher,
    name,
    version,
    manifest: manifest as `ar://${string}`,
    manifest_hash: `${sha256_prefix}${manifest_hash_raw.toString('hex')}`,
    content_hash: `${sha256_prefix}${content_hash_raw.toString('hex')}`,
    content_size_bytes,
    created_at: new Date(created_at_unix * 1000).toISOString(),
    created_at_slot,
  };
}

function decode_release_account_safe(data: Buffer): GutenbergReleaseEvent[] {
  try {
    return [decode_release_account(data)];
  } catch {
    return [];
  }
}

function instruction_discriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function account_discriminator_bytes(name: string): Buffer {
  return createHash('sha256').update(`account:${name}`).digest().subarray(0, 8);
}

function account_discriminator_b58(name: string): string {
  return bs58.encode(account_discriminator_bytes(name));
}

function encode_string(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.byteLength, 0);

  return Buffer.concat([length, bytes]);
}

function seed_hash(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function compare_release_events(
  a: GutenbergReleaseEvent,
  b: GutenbergReleaseEvent,
): number {
  const by_slot = a.created_at_slot - b.created_at_slot;

  if (by_slot !== 0) {
    return by_slot;
  }

  return a.manifest < b.manifest ? -1 : a.manifest > b.manifest ? 1 : 0;
}

class AccountReader {
  private offset = 0;

  constructor(private readonly data: Buffer) {}

  read_bytes(length: number): Buffer {
    const next_offset = this.offset + length;

    if (next_offset > this.data.byteLength) {
      throw new Error('Solana release account is truncated');
    }

    const value = this.data.subarray(this.offset, next_offset);
    this.offset = next_offset;

    return value;
  }

  read_u8(): number {
    return this.read_bytes(1).readUInt8(0);
  }

  read_string(): string {
    const length = this.read_bytes(4).readUInt32LE(0);

    return this.read_bytes(length).toString('utf8');
  }

  read_i64_le(): bigint {
    return this.read_bytes(8).readBigInt64LE(0);
  }

  read_u64_le(): bigint {
    return this.read_bytes(8).readBigUInt64LE(0);
  }
}
