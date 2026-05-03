import { Module } from '@nestjs/common';

import { StatsController } from '../../routes/stats/stats.controller';
import { PublicationsModule } from '../publications/publications.module';
import { PublishersModule } from '../publishers/publishers.module';
import { ReleasesModule } from '../releases/releases.module';

@Module({
  imports: [PublishersModule, PublicationsModule, ReleasesModule],
  controllers: [StatsController],
})
export class StatsModule {}
