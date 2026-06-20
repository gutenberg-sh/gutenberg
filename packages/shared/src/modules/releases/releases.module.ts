import { Module } from '@nestjs/common';
import { DatabaseModule } from '@gutenberg/db';

import { ReleasesRepository } from './releases.repository';
import { ReleasesService } from './releases.service';

@Module({
  imports: [DatabaseModule],
  providers: [ReleasesRepository, ReleasesService],
  exports: [ReleasesRepository, ReleasesService],
})
export class ReleasesModule {}
