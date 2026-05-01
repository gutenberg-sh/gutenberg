import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../common/database/database.module';
import { NamesController } from '../../routes/names/names.controller';
import { SearchController } from '../../routes/search/search.controller';
import { ReleasesModule } from '../releases/releases.module';

import { NamesRepository } from './names.repository';
import { NamesService } from './names.service';

@Module({
  imports: [DatabaseModule, ReleasesModule],
  controllers: [NamesController, SearchController],
  providers: [NamesRepository, NamesService],
  exports: [NamesRepository, NamesService],
})
export class NamesModule {}
