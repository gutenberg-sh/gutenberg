import { Module } from '@nestjs/common';

import { RegistryModule } from '../registry/registry.module';
import { StorageModule } from '../storage/storage.module';

import { DoctorService } from './doctor.service';

@Module({
  imports: [RegistryModule, StorageModule],
  providers: [DoctorService],
  exports: [DoctorService],
})
export class DoctorModule {}
