import { Module } from '@nestjs/common';

import { RegistryModule } from '../registry/registry.module';

import { OpenCommand } from './open.command';

@Module({
  imports: [RegistryModule],
  providers: [OpenCommand],
  exports: [OpenCommand],
})
export class OpenModule {}
