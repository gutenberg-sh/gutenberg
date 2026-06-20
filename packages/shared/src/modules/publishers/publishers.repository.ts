import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DATABASE_DB,
  publishersTable,
  type TSchema,
} from '@gutenberg/db';

import { BaseRepository } from '../../repositories/base.repository';

@Injectable()
export class PublishersRepository extends BaseRepository<
  TSchema,
  typeof publishersTable,
  'publishersTable'
> {
  constructor(@Inject(DATABASE_DB) db: NodePgDatabase<TSchema>) {
    super(db, publishersTable, 'publishersTable');
  }
}
