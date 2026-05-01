import { Injectable } from '@nestjs/common';

import { BaseService } from '../../common/services/base.service';

import {
  CreateReleaseDto,
  ReleaseDto,
  UpdateReleaseDto,
} from './releases.dto';
import { ReleasesRepository } from './releases.repository';

@Injectable()
export class ReleasesService extends BaseService<
  ReleaseDto,
  CreateReleaseDto,
  UpdateReleaseDto,
  'releasesTable'
> {
  constructor(protected readonly releases_repository: ReleasesRepository) {
    super(releases_repository);
  }
}
