import { Injectable } from '@nestjs/common';
import { createPrivateKey, createPublicKey } from 'node:crypto';

import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

import type { PublisherKeypair } from './keys.types';

const ed25519_pkcs8_prefix = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
);
const ed25519_spki_prefix = Buffer.from('302a300506032b6570032100', 'hex');

@Injectable()
export class KeysService {
  constructor(private readonly wallet_repository: SolanaWalletRepository) {}

  load_publisher_key(): PublisherKeypair {
    const wallet = this.wallet_repository.load_keypair();
    const seed = wallet.secretKey.slice(0, 32);
    const public_key_bytes = wallet.publicKey.toBytes();

    return {
      private_key: createPrivateKey({
        key: Buffer.concat([ed25519_pkcs8_prefix, Buffer.from(seed)]),
        format: 'der',
        type: 'pkcs8',
      }),
      public_key: createPublicKey({
        key: Buffer.concat([ed25519_spki_prefix, Buffer.from(public_key_bytes)]),
        format: 'der',
        type: 'spki',
      }),
      publisher: wallet.publicKey.toBase58(),
    };
  }
}
