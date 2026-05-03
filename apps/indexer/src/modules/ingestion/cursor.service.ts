import { Injectable } from '@nestjs/common';

import { BaseService } from '../../common/services/base.service';

import { CreateCursorDto, CursorDto, UpdateCursorDto } from './cursor.dto';
import { CursorRepository } from './cursor.repository';

@Injectable()
export class CursorService extends BaseService<
  CursorDto,
  CreateCursorDto,
  UpdateCursorDto,
  'cursorsTable'
> {
  constructor(protected readonly cursor_repository: CursorRepository) {
    super(cursor_repository);
  }
}
