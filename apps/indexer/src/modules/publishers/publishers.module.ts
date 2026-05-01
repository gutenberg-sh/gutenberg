import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../common/database/database.module';
import { PublishersController } from '../../routes/publishers/publishers.controller';
import { ReleasesModule } from '../releases/releases.module';

import { PublishersRepository } from './publishers.repository';
import { PublishersService } from './publishers.service';

@Module({
  imports: [DatabaseModule, ReleasesModule],
  controllers: [PublishersController],
  providers: [PublishersRepository, PublishersService],
  exports: [PublishersRepository, PublishersService],
})
export class PublishersModule {}
