import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DATABASE_DB } from '../../common/database/database.tokens';
import type { TSchema } from '../../common/database/db.types';
import { cursorsTable } from '../../common/database/tables';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class CursorRepository extends BaseRepository<
  TSchema,
  typeof cursorsTable,
  'cursorsTable'
> {
  constructor(@Inject(DATABASE_DB) db: NodePgDatabase<TSchema>) {
    super(db, cursorsTable, 'cursorsTable');
  }
}
