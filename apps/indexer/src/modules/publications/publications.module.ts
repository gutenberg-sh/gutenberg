import { Module } from '@nestjs/common';

import { PublicationsController } from '../../routes/publications/publications.controller';
import { SearchController } from '../../routes/search/search.controller';
import { DatabaseModule } from '../../common/database/database.module';
import { ReleasesModule } from '../releases/releases.module';

import { PublicationsRepository } from './publications.repository';
import { PublicationsService } from './publications.service';

@Module({
  imports: [DatabaseModule, ReleasesModule],
  controllers: [PublicationsController, SearchController],
  providers: [PublicationsRepository, PublicationsService],
  exports: [PublicationsRepository, PublicationsService],
})
export class PublicationsModule {}
