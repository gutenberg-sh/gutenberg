import { Module } from '@nestjs/common';

import { ConfigModule } from '../config/config.module';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

import { KeysService } from './keys.service';

@Module({
  imports: [ConfigModule],
  providers: [SolanaWalletRepository, KeysService],
  exports: [KeysService],
})
export class KeysModule {}
