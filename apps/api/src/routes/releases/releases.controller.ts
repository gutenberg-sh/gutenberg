import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type QueryConfig, releasesTable } from '@gutenberg/db';
import { ReleasesService } from '@gutenberg/shared';

import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { IncludesPipe } from '../../common/pipes/includes.pipe';
import {
  RELEASE_RELATIONS,
  ReleaseWithRelationsDto,
} from '../../dtos/releases.dto';

import { GetReleaseRequestDto } from './releases.dtos';

@Controller('releases')
@UseInterceptors(SerializationInterceptor)
export class ReleasesController {
  constructor(private readonly releases_service: ReleasesService) {}

  @Get(':address')
  @SerializeWith(ReleaseWithRelationsDto)
  async get_release(
    @Param() params: GetReleaseRequestDto,
    @Query('includes', new IncludesPipe({ allowed: RELEASE_RELATIONS }))
    includes: QueryConfig<'releasesTable'>['with'] = {},
  ): Promise<ReleaseWithRelationsDto> {
    const release = await this.releases_service.find({
      where: eq(releasesTable.address, params.address),
      with: includes,
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    return release;
  }
}
