import { Module } from '@nestjs/common';
import { DatabaseModule } from '@gutenberg/db';

import { ReleasesModule } from '../releases/releases.module';

import { PublishersRepository } from './publishers.repository';
import { PublishersService } from './publishers.service';

@Module({
  imports: [DatabaseModule, ReleasesModule],
  providers: [PublishersRepository, PublishersService],
  exports: [PublishersRepository, PublishersService],
})
export class PublishersModule {}
