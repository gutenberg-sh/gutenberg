import { Module } from '@nestjs/common';
import { Connection } from '@solana/web3.js';

import { SOLANA_RPC_URL } from '../../common/config/config.tokens';

import { SolanaWalletRepository } from './solana-wallet.repository';

@Module({
  providers: [
    SolanaWalletRepository,
    {
      provide: Connection,
      inject: [SOLANA_RPC_URL],
      useFactory: (rpc_url: string): Connection =>
        new Connection(rpc_url, 'confirmed'),
    },
  ],
  exports: [SolanaWalletRepository, Connection],
})
export class SolanaModule {}
