import { Module } from '@nestjs/common';

import { RegistryModule } from '../registry/registry.module';
import { SolanaModule } from '../solana/solana.module';
import { StorageModule } from '../storage/storage.module';

import { DoctorCommand } from './doctor.command';
import { DoctorService } from './doctor.service';

@Module({
  imports: [RegistryModule, SolanaModule, StorageModule],
  providers: [DoctorService, DoctorCommand],
  exports: [DoctorCommand],
})
export class DoctorModule {}
