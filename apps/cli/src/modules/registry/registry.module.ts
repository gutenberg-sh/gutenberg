import { Module } from '@nestjs/common';

import { RegistryService } from './registry.service';
import { SolanaRegistryRepository } from './solana-registry.repository';

@Module({
  providers: [RegistryService, SolanaRegistryRepository],
  exports: [RegistryService, SolanaRegistryRepository],
})
export class RegistryModule {}
