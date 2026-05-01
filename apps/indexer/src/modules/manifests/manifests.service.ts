import { Injectable } from '@nestjs/common';

import { BaseService } from '../../common/services/base.service';

import {
  CreateManifestDto,
  ManifestDto,
  UpdateManifestDto,
} from './manifests.dto';
import { ManifestsRepository } from './manifests.repository';

@Injectable()
export class ManifestsService extends BaseService<
  ManifestDto,
  CreateManifestDto,
  UpdateManifestDto,
  'manifestsTable'
> {
  constructor(protected readonly manifests_repository: ManifestsRepository) {
    super(manifests_repository);
  }
}
