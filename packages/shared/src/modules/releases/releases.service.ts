import { Injectable } from '@nestjs/common';

import { BaseService } from '../../services/base.service';

import { ReleasesRepository } from './releases.repository';

@Injectable()
export class ReleasesService extends BaseService<'releasesTable'> {
  constructor(protected readonly releases_repository: ReleasesRepository) {
    super(releases_repository);
  }
}
