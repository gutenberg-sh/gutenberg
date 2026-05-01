import { Controller, Get, UseInterceptors } from '@nestjs/common';

import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { NamesService } from '../../modules/names/names.service';
import { PublishersService } from '../../modules/publishers/publishers.service';
import { ReleasesService } from '../../modules/releases/releases.service';

import { StatsDto } from './stats.dto';

@Controller('stats')
@UseInterceptors(SerializationInterceptor)
export class StatsController {
  constructor(
    private readonly publishers_service: PublishersService,
    private readonly names_service: NamesService,
    private readonly releases_service: ReleasesService,
  ) {}

  @Get()
  @SerializeWith(StatsDto)
  async get_stats(): Promise<StatsDto> {
    const [releases, names, publishers] = await Promise.all([
      this.releases_service.count(undefined),
      this.names_service.count(undefined),
      this.publishers_service.count(undefined),
    ]);

    return { releases, names, publishers };
  }
}
