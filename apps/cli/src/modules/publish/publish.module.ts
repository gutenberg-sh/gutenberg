import { Module } from '@nestjs/common';

import { KeysModule } from '../keys/keys.module';
import { ManifestModule } from '../manifest/manifest.module';
import { RegistryModule } from '../registry/registry.module';
import { StorageModule } from '../storage/storage.module';

import { PublishCommand } from './publish.command';
import { PublishService } from './publish.service';
import { SiteFilesRepository } from './site-files.repository';
import { UnpublishCommand } from './unpublish.command';
import { UnpublishService } from './unpublish.service';

@Module({
  imports: [KeysModule, ManifestModule, RegistryModule, StorageModule],
  providers: [
    PublishService,
    UnpublishService,
    SiteFilesRepository,
    PublishCommand,
    UnpublishCommand,
  ],
  exports: [PublishCommand, UnpublishCommand],
})
export class PublishModule {}
