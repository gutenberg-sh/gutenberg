import { Module } from '@nestjs/common';
import {
  PublicationsModule,
  PublishersModule,
  ReleasesModule,
} from '@gutenberg/shared';

import { StatsController } from '../../routes/stats/stats.controller';

@Module({
  imports: [PublishersModule, PublicationsModule, ReleasesModule],
  controllers: [StatsController],
})
export class StatsModule {}
