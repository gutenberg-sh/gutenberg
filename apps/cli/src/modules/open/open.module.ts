import { Module } from '@nestjs/common';

import { GatewayModule } from '../gateway/gateway.module';
import { ManifestModule } from '../manifest/manifest.module';
import { RegistryModule } from '../registry/registry.module';
import { StorageModule } from '../storage/storage.module';

import { OpenCommand } from './open.command';
import { OpenService } from './open.service';

@Module({
  imports: [GatewayModule, ManifestModule, RegistryModule, StorageModule],
  providers: [OpenService, OpenCommand],
  exports: [OpenCommand],
})
export class OpenModule {}
