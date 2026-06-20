import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import {
  type QueryConfig,
  publishersTable,
  releasesTable,
} from '@gutenberg/db';
import { PublishersService, ReleasesService } from '@gutenberg/shared';

import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { PaginationOptionsDto } from '../../common/dtos/pagination-options.dto';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { IncludesPipe } from '../../common/pipes/includes.pipe';
import {
  PUBLISHER_RELATIONS,
  PublisherWithRelationsDto,
} from '../../dtos/publishers.dto';
import {
  RELEASE_RELATIONS,
  ReleaseWithRelationsDto,
} from '../../dtos/releases.dto';

import { GetPublisherRequestDto } from './publishers.dtos';

@Controller('publishers')
@UseInterceptors(SerializationInterceptor)
export class PublishersController {
  constructor(
    private readonly publishers_service: PublishersService,
    private readonly releases_service: ReleasesService,
  ) {}

  @Get(':address')
  @SerializeWith(PublisherWithRelationsDto)
  async get_publisher(
    @Param() params: GetPublisherRequestDto,
    @Query('includes', new IncludesPipe({ allowed: PUBLISHER_RELATIONS }))
    includes: QueryConfig<'publishersTable'>['with'] = {},
  ): Promise<PublisherWithRelationsDto> {
    const publisher = await this.publishers_service.find({
      where: eq(publishersTable.address, params.address),
      with: includes,
    });

    if (!publisher) {
      throw new NotFoundException('Publisher not found');
    }

    return publisher;
  }

  @Get(':address/releases')
  @SerializeWith(ReleaseWithRelationsDto)
  async get_publisher_releases(
    @Param() params: GetPublisherRequestDto,
    @Query() pagination: PaginationOptionsDto,
    @Query('includes', new IncludesPipe({ allowed: RELEASE_RELATIONS }))
    includes: QueryConfig<'releasesTable'>['with'] = {},
  ): Promise<ReleaseWithRelationsDto[]> {
    const publisher = await this.publishers_service.find({
      where: eq(publishersTable.address, params.address),
    });

    if (!publisher) {
      throw new NotFoundException('Publisher not found');
    }

    return this.releases_service.find_many({
      where: eq(releasesTable.publisher_id, publisher.id),
      with: includes,
      orderBy: [desc(releasesTable.published_at)],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }
}
