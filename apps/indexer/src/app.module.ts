import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@gutenberg/db';
import {
  ManifestsModule,
  PublicationsModule,
  PublishersModule,
  ReleasesModule,
} from '@gutenberg/shared';

import { ConfigModule } from './common/config/config.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    PublishersModule,
    PublicationsModule,
    ReleasesModule,
    ManifestsModule,
    IngestionModule,
  ],
})
export class AppModule {}
