import { Injectable } from '@nestjs/common';

import { BaseService } from '../../common/services/base.service';

import { CreateNameDto, NameDto, UpdateNameDto } from './names.dto';
import { NamesRepository } from './names.repository';

@Injectable()
export class NamesService extends BaseService<
  NameDto,
  CreateNameDto,
  UpdateNameDto,
  'namesTable'
> {
  constructor(protected readonly names_repository: NamesRepository) {
    super(names_repository);
  }
}
