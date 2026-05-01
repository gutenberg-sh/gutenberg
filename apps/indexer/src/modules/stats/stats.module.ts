import { Module } from '@nestjs/common';

import { StatsController } from '../../routes/stats/stats.controller';
import { NamesModule } from '../names/names.module';
import { PublishersModule } from '../publishers/publishers.module';
import { ReleasesModule } from '../releases/releases.module';

@Module({
  imports: [PublishersModule, NamesModule, ReleasesModule],
  controllers: [StatsController],
})
export class StatsModule {}
