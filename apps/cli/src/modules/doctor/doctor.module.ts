import { Module } from '@nestjs/common';

import { RegistryModule } from '../registry/registry.module';

import { DoctorCommand } from './doctor.command';
import { DoctorService } from './doctor.service';

@Module({
  imports: [RegistryModule],
  providers: [DoctorService, DoctorCommand],
  exports: [DoctorCommand],
})
export class DoctorModule {}
