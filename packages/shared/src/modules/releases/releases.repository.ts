import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DATABASE_DB,
  releasesTable,
  type TSchema,
} from '@gutenberg/db';

import { BaseRepository } from '../../repositories/base.repository';

@Injectable()
export class ReleasesRepository extends BaseRepository<
  TSchema,
  typeof releasesTable,
  'releasesTable'
> {
  constructor(@Inject(DATABASE_DB) db: NodePgDatabase<TSchema>) {
    super(db, releasesTable, 'releasesTable');
  }
}
