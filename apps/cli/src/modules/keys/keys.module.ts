import { Module } from '@nestjs/common';

import { SolanaModule } from '../solana/solana.module';

import { KeysService } from './keys.service';

@Module({
  imports: [SolanaModule],
  providers: [KeysService],
  exports: [KeysService],
})
export class KeysModule {}
