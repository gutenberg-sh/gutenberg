import { Inject, Injectable } from '@nestjs/common';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

import { SOLANA_PRIVATE_KEY_KEY } from '../config/config.symbols';

@Injectable()
export class SolanaWalletRepository {
  constructor(
    @Inject(SOLANA_PRIVATE_KEY_KEY)
    private readonly solanaPrivateKey: string,
  ) {}

  load_keypair(): Keypair {
    try {
      return Keypair.fromSecretKey(bs58.decode(this.solanaPrivateKey));
    } catch (error) {
      throw new Error('Invalid VERITAS_SOLANA_PRIVATE_KEY', { cause: error });
    }
  }
}
