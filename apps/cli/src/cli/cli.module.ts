import { Module } from '@nestjs/common';

import { DoctorModule } from '../doctor/doctor.module';
import { GatewayModule } from '../gateway/gateway.module';
import { OpenModule } from '../open/open.module';
import { PublishModule } from '../publish/publish.module';

import { CliService } from './cli.service';

@Module({
  imports: [DoctorModule, GatewayModule, OpenModule, PublishModule],
  providers: [CliService],
  exports: [CliService],
})
export class CliModule {}
