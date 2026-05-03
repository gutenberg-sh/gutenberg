import { Controller, Get, UseInterceptors } from '@nestjs/common';

import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { PublicationsService } from '../../modules/publications/publications.service';
import { PublishersService } from '../../modules/publishers/publishers.service';
import { ReleasesService } from '../../modules/releases/releases.service';

import { StatsDto } from './stats.dto';

@Controller('stats')
@UseInterceptors(SerializationInterceptor)
export class StatsController {
  constructor(
    private readonly publishers_service: PublishersService,
    private readonly publications_service: PublicationsService,
    private readonly releases_service: ReleasesService,
  ) {}

  @Get()
  @SerializeWith(StatsDto)
  async get_stats(): Promise<StatsDto> {
    const [releases, publications, publishers] = await Promise.all([
      this.releases_service.count(undefined),
      this.publications_service.count(undefined),
      this.publishers_service.count(undefined),
    ]);

    return { releases, publications, publishers };
  }
}
