import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import type { QueryConfig } from '../../common/database/db.types';
import { namesTable, releasesTable } from '../../common/database/tables';
import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { PaginationOptionsDto } from '../../common/dtos/pagination-options.dto';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { IncludesPipe } from '../../common/pipes/includes.pipe';
import {
  NAME_RELATIONS,
  NameWithRelationsDto,
} from '../../modules/names/names.dto';
import { NamesService } from '../../modules/names/names.service';
import {
  RELEASE_RELATIONS,
  ReleaseWithRelationsDto,
} from '../../modules/releases/releases.dto';
import { ReleasesService } from '../../modules/releases/releases.service';

import { GetNameRequestDto } from './names.dtos';

@Controller('names')
@UseInterceptors(SerializationInterceptor)
export class NamesController {
  constructor(
    private readonly names_service: NamesService,
    private readonly releases_service: ReleasesService,
  ) {}

  @Get(':name')
  @SerializeWith(NameWithRelationsDto)
  async get_name(
    @Param() params: GetNameRequestDto,
    @Query('includes', new IncludesPipe({ allowed: NAME_RELATIONS }))
    includes: QueryConfig<'namesTable'>['with'] = {},
  ): Promise<NameWithRelationsDto> {
    const name = await this.names_service.find({
      where: eq(namesTable.name, params.name),
      with: includes,
    });

    if (!name) {
      throw new NotFoundException('Name not found');
    }

    return name;
  }

  @Get(':name/latest')
  @SerializeWith(ReleaseWithRelationsDto)
  async get_name_latest(
    @Param() params: GetNameRequestDto,
    @Query('includes', new IncludesPipe({ allowed: RELEASE_RELATIONS }))
    includes: QueryConfig<'releasesTable'>['with'] = {},
  ): Promise<ReleaseWithRelationsDto> {
    const name = await this.names_service.find({
      where: eq(namesTable.name, params.name),
    });

    if (!name) {
      throw new NotFoundException('Name not found');
    }

    const release = await this.releases_service.find({
      where: eq(releasesTable.name_id, name.id),
      with: includes,
      orderBy: [desc(releasesTable.published_at)],
    });

    if (!release) {
      throw new NotFoundException('No release found for this name');
    }

    return release;
  }

  @Get(':name/versions')
  @SerializeWith(ReleaseWithRelationsDto)
  async get_name_versions(
    @Param() params: GetNameRequestDto,
    @Query() pagination: PaginationOptionsDto,
    @Query('includes', new IncludesPipe({ allowed: RELEASE_RELATIONS }))
    includes: QueryConfig<'releasesTable'>['with'] = {},
  ): Promise<ReleaseWithRelationsDto[]> {
    const name = await this.names_service.find({
      where: eq(namesTable.name, params.name),
    });

    if (!name) {
      throw new NotFoundException('Name not found');
    }

    return this.releases_service.find_many({
      where: eq(releasesTable.name_id, name.id),
      with: includes,
      orderBy: [desc(releasesTable.published_at)],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }
}
