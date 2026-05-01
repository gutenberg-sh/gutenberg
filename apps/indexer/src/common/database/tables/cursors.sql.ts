import { sql } from 'drizzle-orm';
import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { create_prefixed_id } from '../id';

export const cursorsTable = pgTable('cursors', {
  id: text()
    .primaryKey()
    .$defaultFn(() => create_prefixed_id('cur')),
  created_at: timestamp()
    .notNull()
    .default(sql`current_timestamp`),
  updated_at: timestamp()
    .notNull()
    .default(sql`current_timestamp`)
    .$onUpdate(() => new Date()),

  scope: text().notNull().unique(),
  last_signature: text(),
  last_slot: bigint({ mode: 'number' }),
  backfill_completed_at: timestamp(),
});
