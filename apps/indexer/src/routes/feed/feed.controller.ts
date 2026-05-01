import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { desc } from 'drizzle-orm';

import type { QueryConfig } from '../../common/database/db.types';
import { releasesTable } from '../../common/database/tables';
import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { PaginationOptionsDto } from '../../common/dtos/pagination-options.dto';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { IncludesPipe } from '../../common/pipes/includes.pipe';
import {
  RELEASE_RELATIONS,
  ReleaseWithRelationsDto,
} from '../../modules/releases/releases.dto';
import { ReleasesService } from '../../modules/releases/releases.service';

@Controller('feed')
@UseInterceptors(SerializationInterceptor)
export class FeedController {
  constructor(private readonly releases_service: ReleasesService) {}

  @Get()
  @SerializeWith(ReleaseWithRelationsDto)
  async get_feed(
    @Query() pagination: PaginationOptionsDto,
    @Query('includes', new IncludesPipe({ allowed: RELEASE_RELATIONS }))
    includes: QueryConfig<'releasesTable'>['with'] = {},
  ): Promise<ReleaseWithRelationsDto[]> {
    return this.releases_service.find_many({
      with: includes,
      orderBy: [desc(releasesTable.published_at)],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }
}
