import { Injectable } from '@nestjs/common';
import {
  ComputeBudgetProgram,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
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
  type UnpublishBatchInput,
  type UnpublishInput,
} from './registry.types';

export const GUTENBERG_REGISTRY_PROGRAM_ID =
  'NRrK71RxAHpt5CdLUWgRzTuzMopnRBnEqCiCku6J517';

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

  async publish_release(event: GutenbergReleaseEvent): Promise<void> {
    const wallet = await this.wallet_repository.load_keypair();
    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: this.program_id(),
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          {
            pubkey: this.name_authority_address(event.name),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: this.release_address({
              publisher: event.publisher,
              name: event.name,
              version: event.version,
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
        data: encode_publish_release_instruction(event),
      }),
    );

    await sendAndConfirmTransaction(this.connection, transaction, [wallet], {
      commitment: 'confirmed',
    });
  }

  async unpublish_release(input: UnpublishInput): Promise<void> {
    const wallet = await this.wallet_repository.load_keypair();
    const transaction = new Transaction().add(
      this.create_unpublish_instruction(wallet.publicKey, input),
    );

    await sendAndConfirmTransaction(this.connection, transaction, [wallet], {
      commitment: 'confirmed',
    });
  }

  async unpublish_releases_batch(input: UnpublishBatchInput): Promise<void> {
    const unique_sorted = [...new Set(input.versions)].sort();

    if (unique_sorted.length === 0) {
      throw new Error('No versions to unpublish');
    }

    const wallet = await this.wallet_repository.load_keypair();
    const transaction = new Transaction();

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: Math.min(1_400_000, 40_000 + unique_sorted.length * 130_000),
      }),
    );

    for (const version of unique_sorted) {
      transaction.add(
        this.create_unpublish_instruction(wallet.publicKey, {
          name: input.name,
          version,
        }),
      );
    }

    await sendAndConfirmTransaction(this.connection, transaction, [wallet], {
      commitment: 'confirmed',
    });
  }

  async list_releases(): Promise<GutenbergReleaseEvent[]> {
    const accounts = await this.connection.getProgramAccounts(
      this.program_id(),
    );

    return accounts
      .flatMap(({ account }) => decode_release_account_safe(account.data))
      .sort(compare_release_events);
  }

  async find_release(
    input: FindReleaseInput,
  ): Promise<GutenbergReleaseEvent | undefined> {
    if (input.publisher && input.version) {
      const account = await this.connection.getAccountInfo(
        this.release_address({
          publisher: input.publisher,
          name: input.name,
          version: input.version,
        }),
      );

      if (!account) {
        return undefined;
      }

      return decode_release_account(account.data);
    }

    const releases = await this.list_releases();
    const matches = releases.filter(
      (event) =>
        event.name === input.name &&
        (input.version === undefined || event.version === input.version) &&
        (input.publisher === undefined || event.publisher === input.publisher),
    );

    return matches.at(-1);
  }

  async has_release(input: HasReleaseInput): Promise<boolean> {
    const release_address = this.release_address(input);

    return (await this.connection.getAccountInfo(release_address)) !== null;
  }

  private create_unpublish_instruction(
    publisher: PublicKey,
    input: UnpublishInput,
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
            publisher: publisher.toBase58(),
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
      data: encode_unpublish_release_instruction(input),
    });
  }

  private name_authority_address(name: string): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from('name'), seed_hash(name)],
      this.program_id(),
    );

    return address;
  }

  release_address(input: {
    publisher: string;
    name: string;
    version: string;
  }): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('release'),
        new PublicKey(input.publisher).toBuffer(),
        seed_hash(input.name),
        seed_hash(input.version),
      ],
      this.program_id(),
    );

    return address;
  }
}

function encode_unpublish_release_instruction(input: UnpublishInput): Buffer {
  return Buffer.concat([
    instruction_discriminator('unpublish_release'),
    encode_string(input.name),
    encode_string(input.version),
    seed_hash(input.name),
    seed_hash(input.version),
  ]);
}

function encode_publish_release_instruction(
  event: GutenbergReleaseEvent,
): Buffer {
  const created_unix = Math.trunc(Date.parse(event.created_at) / 1000);

  if (!Number.isFinite(created_unix)) {
    throw new Error('Release event created_at must be a valid date');
  }

  return Buffer.concat([
    instruction_discriminator('publish_release'),
    encode_string(event.name),
    encode_string(event.version),
    encode_string(event.manifest),
    manifest_hash_string_to_raw(event.manifest_hash),
    encode_i64_le(created_unix),
    seed_hash(event.name),
    seed_hash(event.version),
  ]);
}

function manifest_hash_string_to_raw(
  hash: GutenbergReleaseEvent['manifest_hash'],
): Buffer {
  const hex = hash.startsWith(sha256_prefix)
    ? hash.slice(sha256_prefix.length)
    : hash;
  const raw = Buffer.from(hex, 'hex');

  if (raw.byteLength !== 32) {
    throw new Error('Release manifest_hash must be a 32-byte sha256 digest');
  }

  return raw;
}

function encode_i64_le(seconds: number): Buffer {
  const out = Buffer.allocUnsafe(8);
  out.writeBigInt64LE(BigInt(seconds), 0);

  return out;
}

function decode_name_authority_account(data: Buffer): PublicKey | undefined {
  if (data.byteLength < 40) {
    return undefined;
  }

  if (!data.subarray(0, 8).equals(account_discriminator('NameAuthority'))) {
    return undefined;
  }

  return new PublicKey(data.subarray(8, 40));
}

function decode_release_account(data: Buffer): GutenbergReleaseEvent {
  const reader = new AccountReader(data);
  const discriminator = reader.read_bytes(8);

  if (!discriminator.equals(account_discriminator('Release'))) {
    throw new Error('Invalid Solana release account discriminator');
  }

  const publisher = new PublicKey(reader.read_bytes(32)).toBase58();
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
    manifest_hash: `${sha256_prefix}${manifest_hash_raw.toString('hex')}`,
    publisher,
    created_at: new Date(created_at_unix * 1000).toISOString(),
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

function account_discriminator(name: string): Buffer {
  return createHash('sha256').update(`account:${name}`).digest().subarray(0, 8);
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
  const by_created_at = Date.parse(a.created_at) - Date.parse(b.created_at);

  if (by_created_at !== 0) {
    return by_created_at;
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

  read_string(): string {
    const length = this.read_bytes(4).readUInt32LE(0);

    return this.read_bytes(length).toString('utf8');
  }

  read_i64_le(): number {
    const bytes = this.read_bytes(8);

    return Number(bytes.readBigInt64LE(0));
  }
}
