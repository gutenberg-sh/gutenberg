import { Module } from '@nestjs/common';

import { RegistryModule } from '../registry/registry.module';

import { PublishCommand } from './publish.command';
import { PublishService } from './publish.service';
import { ReleaseFilesRepository } from './release-files.repository';

@Module({
  imports: [RegistryModule],
  providers: [PublishService, ReleaseFilesRepository, PublishCommand],
  exports: [PublishCommand],
})
export class PublishModule {}
