import { Module } from '@nestjs/common';

import { SolanaModule } from '../solana/solana.module';

import { StorageService } from './storage.service';

@Module({
  imports: [SolanaModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
