import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@gutenberg/db';
import {
  PublicationsModule,
  PublishersModule,
  ReleasesModule,
} from '@gutenberg/shared';

import { ConfigModule } from './common/config/config.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { StatsModule } from './modules/stats/stats.module';
import { FeedController } from './routes/feed/feed.controller';
import { HealthController } from './routes/health/health.controller';
import { PublicationsController } from './routes/publications/publications.controller';
import { PublishersController } from './routes/publishers/publishers.controller';
import { ReleasesController } from './routes/releases/releases.controller';
import { SearchController } from './routes/search/search.controller';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    PublishersModule,
    PublicationsModule,
    ReleasesModule,
    StatsModule,
  ],
  controllers: [
    FeedController,
    HealthController,
    PublicationsController,
    PublishersController,
    ReleasesController,
    SearchController,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidUnknownValues: true,
        }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
