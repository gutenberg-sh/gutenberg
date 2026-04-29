import { Module } from '@nestjs/common';
import { Connection } from '@solana/web3.js';

import { SOLANA_RPC_URL_KEY } from '../config/config.symbols';
import { ConfigModule } from '../config/config.module';
import { ManifestModule } from '../manifest/manifest.module';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

import { RELEASE_REGISTRY_REPOSITORY } from './registry.tokens';
import { RegistryService } from './registry.service';
import { SolanaRegistryRepository } from './solana-registry.repository';

@Module({
  imports: [ManifestModule, ConfigModule],
  providers: [
    RegistryService,
    SolanaWalletRepository,
    SolanaRegistryRepository,
    {
      provide: Connection,
      inject: [SOLANA_RPC_URL_KEY],
      useFactory: (solanaRpcUrl: string): Connection =>
        new Connection(solanaRpcUrl, 'confirmed'),
    },
    {
      provide: RELEASE_REGISTRY_REPOSITORY,
      useExisting: SolanaRegistryRepository,
    },
  ],
  exports: [
    RegistryService,
    RELEASE_REGISTRY_REPOSITORY,
    SolanaRegistryRepository,
    SolanaWalletRepository,
  ],
})
export class RegistryModule {}
