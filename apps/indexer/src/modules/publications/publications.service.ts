import { Injectable } from '@nestjs/common';

import { BaseService } from '../../common/services/base.service';

import {
  CreatePublicationDto,
  PublicationDto,
  UpdatePublicationDto,
} from './publications.dto';
import { PublicationsRepository } from './publications.repository';

@Injectable()
export class PublicationsService extends BaseService<
  PublicationDto,
  CreatePublicationDto,
  UpdatePublicationDto,
  'publicationsTable'
> {
  constructor(
    protected readonly publications_repository: PublicationsRepository,
  ) {
    super(publications_repository);
  }
}
