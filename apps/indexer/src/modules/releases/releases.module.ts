import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../common/database/database.module';
import { FeedController } from '../../routes/feed/feed.controller';
import { ReleasesController } from '../../routes/releases/releases.controller';

import { ReleasesRepository } from './releases.repository';
import { ReleasesService } from './releases.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReleasesController, FeedController],
  providers: [ReleasesRepository, ReleasesService],
  exports: [ReleasesRepository, ReleasesService],
})
export class ReleasesModule {}
