import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { desc, ilike, or, sql } from 'drizzle-orm';
import { type QueryConfig, publicationsTable } from '@gutenberg/db';
import { PublicationsService } from '@gutenberg/shared';

import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { IncludesPipe } from '../../common/pipes/includes.pipe';
import {
  PUBLICATION_RELATIONS,
  PublicationWithRelationsDto,
} from '../../dtos/publications.dto';

import { SearchPublicationsRequestDto } from './search.dtos';

@Controller('search')
@UseInterceptors(SerializationInterceptor)
export class SearchController {
  constructor(private readonly publications_service: PublicationsService) {}

  @Get()
  @SerializeWith(PublicationWithRelationsDto)
  async search(
    @Query() query: SearchPublicationsRequestDto,
    @Query('includes', new IncludesPipe({ allowed: PUBLICATION_RELATIONS }))
    includes: QueryConfig<'publicationsTable'>['with'] = {},
  ): Promise<PublicationWithRelationsDto[]> {
    const trimmed = query.q.trim();
    const like_pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`;

    return this.publications_service.find_many({
      where: or(
        ilike(publicationsTable.registry_id, like_pattern),
        sql`${publicationsTable.registry_id} % ${trimmed}`,
      ),
      with: includes,
      orderBy: [
        desc(sql`similarity(${publicationsTable.registry_id}, ${trimmed})`),
      ],
      limit: query.limit,
      offset: query.offset,
    });
  }
}
