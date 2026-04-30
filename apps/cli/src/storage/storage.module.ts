import { Module } from '@nestjs/common';

import { ConfigModule } from '../config/config.module';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

import { IrysStorageRepository } from './irys-storage.repository';
import { CONTENT_STORE } from './storage.tokens';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SolanaWalletRepository,
    IrysStorageRepository,
    StorageService,
    {
      provide: CONTENT_STORE,
      useExisting: StorageService,
    },
  ],
  exports: [CONTENT_STORE, StorageService, IrysStorageRepository],
})
export class StorageModule {}
