import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DATABASE_DB,
  manifestsTable,
  type TSchema,
} from '@gutenberg/db';

import { BaseRepository } from '../../repositories/base.repository';

@Injectable()
export class ManifestsRepository extends BaseRepository<
  TSchema,
  typeof manifestsTable,
  'manifestsTable'
> {
  constructor(@Inject(DATABASE_DB) db: NodePgDatabase<TSchema>) {
    super(db, manifestsTable, 'manifestsTable');
  }
}
