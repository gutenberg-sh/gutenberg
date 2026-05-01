import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { desc, ilike, or, sql } from 'drizzle-orm';

import type { QueryConfig } from '../../common/database/db.types';
import { namesTable } from '../../common/database/tables';
import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { IncludesPipe } from '../../common/pipes/includes.pipe';
import {
  NAME_RELATIONS,
  NameWithRelationsDto,
} from '../../modules/names/names.dto';
import { NamesService } from '../../modules/names/names.service';

import { SearchNamesRequestDto } from './search.dtos';

@Controller('search')
@UseInterceptors(SerializationInterceptor)
export class SearchController {
  constructor(private readonly names_service: NamesService) {}

  @Get()
  @SerializeWith(NameWithRelationsDto)
  async search(
    @Query() query: SearchNamesRequestDto,
    @Query('includes', new IncludesPipe({ allowed: NAME_RELATIONS }))
    includes: QueryConfig<'namesTable'>['with'] = {},
  ): Promise<NameWithRelationsDto[]> {
    const trimmed = query.q.trim();
    const like_pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`;

    return this.names_service.find_many({
      where: or(
        ilike(namesTable.name, like_pattern),
        sql`${namesTable.name} % ${trimmed}`,
      ),
      with: includes,
      orderBy: [desc(sql`similarity(${namesTable.name}, ${trimmed})`)],
      limit: query.limit,
      offset: query.offset,
    });
  }
}
