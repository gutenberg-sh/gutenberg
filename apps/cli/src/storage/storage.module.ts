import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';

import {
  STORAGE_ACCESS_KEY_KEY,
  STORAGE_ENDPOINT_KEY,
  STORAGE_SECRET_KEY_KEY,
} from '../config/config.symbols';
import { ConfigModule } from '../config/config.module';
import { ManifestModule } from '../manifest/manifest.module';

import { S3StorageRepository } from './s3-storage.repository';
import { CONTENT_STORE } from './storage.tokens';
import { StorageService } from './storage.service';

@Module({
  imports: [ManifestModule, ConfigModule],
  providers: [
    S3StorageRepository,
    StorageService,
    {
      provide: S3Client,
      inject: [
        STORAGE_ENDPOINT_KEY,
        STORAGE_ACCESS_KEY_KEY,
        STORAGE_SECRET_KEY_KEY,
      ],
      useFactory: (
        endpoint: string,
        accessKeyId: string,
        secretAccessKey: string,
      ): S3Client =>
        new S3Client({
          endpoint,
          region: 'auto',
          forcePathStyle: true,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }),
    },
    {
      provide: CONTENT_STORE,
      useExisting: StorageService,
    },
  ],
  exports: [CONTENT_STORE, StorageService, S3StorageRepository],
})
export class StorageModule {}
