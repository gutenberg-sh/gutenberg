import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { type QueryConfig, releasesTable } from '@gutenberg/db';
import { ReleasesService } from '@gutenberg/shared';

import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { PaginationOptionsDto } from '../../common/dtos/pagination-options.dto';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { IncludesPipe } from '../../common/pipes/includes.pipe';
import {
  RELEASE_RELATIONS,
  ReleaseWithRelationsDto,
} from '../../dtos/releases.dto';

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
