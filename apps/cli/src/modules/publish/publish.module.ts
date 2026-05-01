import { Module } from '@nestjs/common';

import { RegistryModule } from '../registry/registry.module';

import { PublishCommand } from './publish.command';
import { PublishService } from './publish.service';
import { SiteFilesRepository } from './site-files.repository';

@Module({
  imports: [RegistryModule],
  providers: [PublishService, SiteFilesRepository, PublishCommand],
  exports: [PublishCommand],
})
export class PublishModule {}
