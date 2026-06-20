import { Injectable } from '@nestjs/common';
import { BaseService } from '@gutenberg/shared';

import { CursorRepository } from './cursor.repository';

@Injectable()
export class CursorService extends BaseService<'cursorsTable'> {
  constructor(protected readonly cursor_repository: CursorRepository) {
    super(cursor_repository);
  }
}
