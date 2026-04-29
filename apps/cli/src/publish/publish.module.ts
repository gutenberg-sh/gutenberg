import { Module } from '@nestjs/common';

import { KeysModule } from '../keys/keys.module';
import { ManifestModule } from '../manifest/manifest.module';
import { RegistryModule } from '../registry/registry.module';
import { StorageModule } from '../storage/storage.module';

import { PublishService } from './publish.service';
import { SiteFilesRepository } from './site-files.repository';

@Module({
  imports: [KeysModule, ManifestModule, RegistryModule, StorageModule],
  providers: [PublishService, SiteFilesRepository],
  exports: [PublishService, SiteFilesRepository],
})
export class PublishModule {}
