import { Inject, Injectable } from '@nestjs/common';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { createHash } from 'node:crypto';

import { REGISTRY_PROGRAM_ID_KEY } from '../config/config.symbols';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

import type {
  FindReleaseInput,
  HasReleaseInput,
  ReleaseRegistryRepository,
  VeritasReleaseEventV0,
} from './registry.types';
import { release_event_type } from './registry.types';

@Injectable()
export class SolanaRegistryRepository implements ReleaseRegistryRepository {
  constructor(
    private readonly connection: Connection,
    @Inject(REGISTRY_PROGRAM_ID_KEY)
    private readonly registryProgramId: string | undefined,
    private readonly solanaWalletRepository: SolanaWalletRepository,
  ) {}

  async assert_can_publish(): Promise<void> {
    const { public_key, sol } = await this.get_wallet_balance();

    if (sol === 0) {
      throw new Error(
        `Solana wallet ${public_key.toBase58()} has 0 SOL on the configured RPC cluster`,
      );
    }
  }

  async publish_release(event: VeritasReleaseEventV0): Promise<void> {
    const program_id = this.require_program_id();
    const wallet = this.solanaWalletRepository.load_keypair();
    const release_address = this.release_address({
      publisher: event.publisher,
      name: event.name,
      version: event.version,
    });
    const instruction = new TransactionInstruction({
      programId: program_id,
      keys: [
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: release_address,
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
    });
    const transaction = new Transaction().add(instruction);

    await sendAndConfirmTransaction(this.connection, transaction, [wallet], {
      commitment: 'confirmed',
    });
  }

  async get_wallet_balance(): Promise<{ public_key: PublicKey; sol: number }> {
    const wallet = this.solanaWalletRepository.load_keypair();
    const balance = await this.connection.getBalance(wallet.publicKey);

    return {
      public_key: wallet.publicKey,
      sol: balance / LAMPORTS_PER_SOL,
    };
  }

  async list_releases(): Promise<VeritasReleaseEventV0[]> {
    const program_id = this.require_program_id();
    const accounts = await this.connection.getProgramAccounts(program_id);

    return accounts
      .flatMap(({ account }) => decode_release_account_safe(account.data))
      .sort(compare_release_events);
  }

  async find_release(
    input: FindReleaseInput,
  ): Promise<VeritasReleaseEventV0 | undefined> {
    if (input.publisher && input.version) {
      const release_address = this.release_address({
        publisher: input.publisher,
        name: input.name,
        version: input.version,
      });
      const account = await this.connection.getAccountInfo(release_address);

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
    const release_address = this.release_address({
      publisher: input.publisher,
      name: input.name,
      version: input.version,
    });

    return (await this.connection.getAccountInfo(release_address)) !== null;
  }

  async check_rpc_connection(): Promise<string> {
    const version = await this.connection.getVersion();

    return version['solana-core'];
  }

  check_registry_program_id(): PublicKey {
    return this.require_program_id();
  }

  release_address(input: {
    publisher: string;
    name: string;
    version: string;
  }): PublicKey {
    const program_id = this.require_program_id();
    const [address] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('release'),
        seed_hash(input.publisher),
        seed_hash(input.name),
        seed_hash(input.version),
      ],
      program_id,
    );

    return address;
  }

  private require_program_id(): PublicKey {
    const program_id = this.registryProgramId;

    if (!program_id) {
      throw new Error('VERITAS_REGISTRY_PROGRAM_ID is required');
    }

    return new PublicKey(program_id);
  }
}

function encode_publish_release_instruction(
  event: VeritasReleaseEventV0,
): Buffer {
  return Buffer.concat([
    instruction_discriminator('publish_release'),
    encode_string(event.name),
    encode_string(event.version),
    encode_string(event.manifest),
    encode_string(event.publisher),
    encode_string(event.signature),
    encode_string(event.created_at),
    seed_hash(event.publisher),
    seed_hash(event.name),
    seed_hash(event.version),
  ]);
}

function decode_release_account(data: Buffer): VeritasReleaseEventV0 {
  const reader = new AccountReader(data);
  const discriminator = reader.read_bytes(8);

  if (!discriminator.equals(account_discriminator('Release'))) {
    throw new Error('Invalid Solana release account discriminator');
  }

  reader.read_bytes(32);
  const name = reader.read_string();
  const version = reader.read_string();
  const manifest = reader.read_string();
  const publisher = reader.read_string();
  const signature = reader.read_string();
  const created_at = reader.read_string();

  return {
    type: release_event_type,
    name,
    version,
    manifest: manifest as VeritasReleaseEventV0['manifest'],
    publisher,
    created_at,
    signature: signature as VeritasReleaseEventV0['signature'],
  };
}

function decode_release_account_safe(data: Buffer): VeritasReleaseEventV0[] {
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
  a: VeritasReleaseEventV0,
  b: VeritasReleaseEventV0,
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
}
