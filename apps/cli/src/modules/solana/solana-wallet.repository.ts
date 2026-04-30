import { Inject, Injectable } from '@nestjs/common';
import { Keypair } from '@solana/web3.js';

import { SOLANA_PRIVATE_KEY } from '../../common/config/config.tokens';
import {
  prompt_hidden,
  prompt_yes_no,
  write_status,
} from '../../common/helpers/prompt';

import {
  decode_base58_secret_key,
  read_stored_keypair,
  wallet_storage_path,
  write_stored_keypair,
} from './wallet-storage';

export type WalletSource = 'env' | 'stored' | 'prompt';

export interface LoadedWallet {
  keypair: Keypair;
  source: WalletSource;
}

@Injectable()
export class SolanaWalletRepository {
  private cached?: LoadedWallet;

  constructor(
    @Inject(SOLANA_PRIVATE_KEY)
    private readonly env_private_key: string | undefined,
  ) {}

  /**
   * Resolve the publisher's keypair, prompting the user on first use if no
   * key has been configured. Cached for the lifetime of the process so write
   * commands only ever prompt once per invocation.
   */
  async load_keypair(): Promise<Keypair> {
    return (await this.load()).keypair;
  }

  /**
   * Resolve the keypair without prompting. Returns `undefined` when no key
   * is available from environment or disk. Used by `doctor` so it can report
   * configuration without forcing an interactive flow.
   */
  async try_load_keypair(): Promise<LoadedWallet | undefined> {
    if (this.cached) {
      return this.cached;
    }

    const env_loaded = this.try_load_from_env();

    if (env_loaded) {
      this.cached = env_loaded;

      return env_loaded;
    }

    const stored = await read_stored_keypair();

    if (stored) {
      this.cached = { keypair: stored, source: 'stored' };

      return this.cached;
    }

    return undefined;
  }

  private async load(): Promise<LoadedWallet> {
    const existing = await this.try_load_keypair();

    if (existing) {
      return existing;
    }

    const prompted = await this.prompt_for_keypair();

    this.cached = prompted;

    return prompted;
  }

  private try_load_from_env(): LoadedWallet | undefined {
    if (this.env_private_key === undefined) {
      return undefined;
    }

    return {
      keypair: decode_base58_secret_key(this.env_private_key),
      source: 'env',
    };
  }

  private async prompt_for_keypair(): Promise<LoadedWallet> {
    write_status('No Gutenberg publisher key configured.');
    write_status(
      'Paste your Solana base58 secret key. Input is hidden and stays on this machine.',
    );

    const secret = await prompt_hidden('Secret key: ');
    const keypair = decode_base58_secret_key(secret);

    write_status(`Loaded wallet ${keypair.publicKey.toBase58()}`);

    const save = await prompt_yes_no(
      `Save it to ${wallet_storage_path} for next time?`,
      { default_yes: true },
    );

    if (save) {
      const path = await write_stored_keypair(keypair);

      write_status(`Saved wallet to ${path}`);
    }

    return { keypair, source: 'prompt' };
  }
}
