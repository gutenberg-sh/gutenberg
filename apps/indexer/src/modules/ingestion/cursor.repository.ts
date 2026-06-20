import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  cursorsTable,
  DATABASE_DB,
  type TSchema,
} from '@gutenberg/db';
import { BaseRepository } from '@gutenberg/shared';

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
