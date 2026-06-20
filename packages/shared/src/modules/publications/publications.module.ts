import { Module } from '@nestjs/common';
import { DatabaseModule } from '@gutenberg/db';

import { ReleasesModule } from '../releases/releases.module';

import { PublicationsRepository } from './publications.repository';
import { PublicationsService } from './publications.service';

@Module({
  imports: [DatabaseModule, ReleasesModule],
  providers: [PublicationsRepository, PublicationsService],
  exports: [PublicationsRepository, PublicationsService],
})
export class PublicationsModule {}
