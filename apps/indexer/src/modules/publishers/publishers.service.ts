import { Injectable } from '@nestjs/common';

import { BaseService } from '../../common/services/base.service';

import {
  CreatePublisherDto,
  PublisherDto,
  UpdatePublisherDto,
} from './publishers.dto';
import { PublishersRepository } from './publishers.repository';

@Injectable()
export class PublishersService extends BaseService<
  PublisherDto,
  CreatePublisherDto,
  UpdatePublisherDto,
  'publishersTable'
> {
  constructor(protected readonly publishers_repository: PublishersRepository) {
    super(publishers_repository);
  }
}
