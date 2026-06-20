import { Injectable } from '@nestjs/common';

import { BaseService } from '../../services/base.service';

import { PublishersRepository } from './publishers.repository';

@Injectable()
export class PublishersService extends BaseService<'publishersTable'> {
  constructor(protected readonly publishers_repository: PublishersRepository) {
    super(publishers_repository);
  }
}
