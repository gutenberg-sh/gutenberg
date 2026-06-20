import { Injectable } from '@nestjs/common';

import { BaseService } from '../../services/base.service';

import { PublicationsRepository } from './publications.repository';

@Injectable()
export class PublicationsService extends BaseService<'publicationsTable'> {
  constructor(
    protected readonly publications_repository: PublicationsRepository,
  ) {
    super(publications_repository);
  }
}
