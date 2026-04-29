import { Module } from '@nestjs/common';

import { DoctorModule } from '../doctor/doctor.module';
import { OpenModule } from '../open/open.module';
import { PublishModule } from '../publish/publish.module';
import { RegistryModule } from '../registry/registry.module';

import { CliService } from './cli.service';

@Module({
  imports: [DoctorModule, OpenModule, PublishModule, RegistryModule],
  providers: [CliService],
  exports: [CliService],
})
export class CliModule {}
