import { Module } from '@nestjs/common';

import { ManifestModule } from '../manifest/manifest.module';
import { RegistryModule } from '../registry/registry.module';
import { StorageModule } from '../storage/storage.module';

import { OpenService } from './open.service';

@Module({
  imports: [ManifestModule, RegistryModule, StorageModule],
  providers: [OpenService],
  exports: [OpenService],
})
export class OpenModule {}
