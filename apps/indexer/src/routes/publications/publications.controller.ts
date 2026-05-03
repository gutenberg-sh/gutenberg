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
import { publicationsTable, releasesTable } from '../../common/database/tables';
import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { PaginationOptionsDto } from '../../common/dtos/pagination-options.dto';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { IncludesPipe } from '../../common/pipes/includes.pipe';
import {
  PUBLICATION_RELATIONS,
  PublicationWithRelationsDto,
} from '../../modules/publications/publications.dto';
import { PublicationsService } from '../../modules/publications/publications.service';
import {
  RELEASE_RELATIONS,
  ReleaseWithRelationsDto,
} from '../../modules/releases/releases.dto';
import { ReleasesService } from '../../modules/releases/releases.service';

import { GetPublicationRequestDto } from './publications.dtos';

@Controller('publications')
@UseInterceptors(SerializationInterceptor)
export class PublicationsController {
  constructor(
    private readonly publications_service: PublicationsService,
    private readonly releases_service: ReleasesService,
  ) {}

  @Get(':registry_id')
  @SerializeWith(PublicationWithRelationsDto)
  async get_publication(
    @Param() params: GetPublicationRequestDto,
    @Query('includes', new IncludesPipe({ allowed: PUBLICATION_RELATIONS }))
    includes: QueryConfig<'publicationsTable'>['with'] = {},
  ): Promise<PublicationWithRelationsDto> {
    const publication = await this.publications_service.find({
      where: eq(publicationsTable.registry_id, params.registry_id),
      with: includes,
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    return publication;
  }

  @Get(':registry_id/latest')
  @SerializeWith(ReleaseWithRelationsDto)
  async get_publication_latest(
    @Param() params: GetPublicationRequestDto,
    @Query('includes', new IncludesPipe({ allowed: RELEASE_RELATIONS }))
    includes: QueryConfig<'releasesTable'>['with'] = {},
  ): Promise<ReleaseWithRelationsDto> {
    const publication = await this.publications_service.find({
      where: eq(publicationsTable.registry_id, params.registry_id),
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    const release = await this.releases_service.find({
      where: eq(releasesTable.publication_id, publication.id),
      with: includes,
      orderBy: [desc(releasesTable.published_at)],
    });

    if (!release) {
      throw new NotFoundException('No release found for this publication');
    }

    return release;
  }

  @Get(':registry_id/versions')
  @SerializeWith(ReleaseWithRelationsDto)
  async get_publication_versions(
    @Param() params: GetPublicationRequestDto,
    @Query() pagination: PaginationOptionsDto,
    @Query('includes', new IncludesPipe({ allowed: RELEASE_RELATIONS }))
    includes: QueryConfig<'releasesTable'>['with'] = {},
  ): Promise<ReleaseWithRelationsDto[]> {
    const publication = await this.publications_service.find({
      where: eq(publicationsTable.registry_id, params.registry_id),
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    return this.releases_service.find_many({
      where: eq(releasesTable.publication_id, publication.id),
      with: includes,
      orderBy: [desc(releasesTable.published_at)],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }
}
