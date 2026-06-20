import { Injectable } from '@nestjs/common';

import { BaseService } from '../../services/base.service';

import { ManifestsRepository } from './manifests.repository';

@Injectable()
export class ManifestsService extends BaseService<'manifestsTable'> {
  constructor(protected readonly manifests_repository: ManifestsRepository) {
    super(manifests_repository);
  }
}
