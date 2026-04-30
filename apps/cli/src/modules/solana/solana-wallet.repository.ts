import { Inject, Injectable } from '@nestjs/common';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

import { SOLANA_PRIVATE_KEY } from '../../common/config/config.tokens';

@Injectable()
export class SolanaWalletRepository {
  constructor(
    @Inject(SOLANA_PRIVATE_KEY)
    private readonly solana_private_key: string,
  ) {}

  load_keypair(): Keypair {
    try {
      return Keypair.fromSecretKey(bs58.decode(this.solana_private_key));
    } catch (error) {
      throw new Error('Invalid GUTENBERG_SOLANA_PRIVATE_KEY', { cause: error });
    }
  }
}
