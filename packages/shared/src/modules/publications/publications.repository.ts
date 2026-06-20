import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DATABASE_DB,
  publicationsTable,
  type TSchema,
} from '@gutenberg/db';

import { BaseRepository } from '../../repositories/base.repository';

@Injectable()
export class PublicationsRepository extends BaseRepository<
  TSchema,
  typeof publicationsTable,
  'publicationsTable'
> {
  constructor(@Inject(DATABASE_DB) db: NodePgDatabase<TSchema>) {
    super(db, publicationsTable, 'publicationsTable');
  }
}
