import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../common/database/database.module';

import { ManifestsRepository } from './manifests.repository';
import { ManifestsService } from './manifests.service';

@Module({
  imports: [DatabaseModule],
  providers: [ManifestsRepository, ManifestsService],
  exports: [ManifestsRepository, ManifestsService],
})
export class ManifestsModule {}
