import { Module } from '@nestjs/common';

import { CliModule } from './cli/cli.module';
import { ConfigModule } from './config/config.module';
import { KeysModule } from './keys/keys.module';
import { ManifestModule } from './manifest/manifest.module';
import { OpenModule } from './open/open.module';
import { PublishModule } from './publish/publish.module';
import { RegistryModule } from './registry/registry.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    ManifestModule,
    KeysModule,
    StorageModule,
    RegistryModule,
    PublishModule,
    OpenModule,
    CliModule,
  ],
})
export class AppModule {}
