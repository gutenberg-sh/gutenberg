import { Module } from '@nestjs/common';

import { ManifestModule } from '../manifest/manifest.module';
import { SolanaModule } from '../solana/solana.module';

import { RegistryService } from './registry.service';
import { SolanaRegistryRepository } from './solana-registry.repository';

@Module({
  imports: [ManifestModule, SolanaModule],
  providers: [RegistryService, SolanaRegistryRepository],
  exports: [RegistryService, SolanaRegistryRepository],
})
export class RegistryModule {}
