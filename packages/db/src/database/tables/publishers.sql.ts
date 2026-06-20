import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { create_prefixed_id } from '../id';

import { publicationsTable } from './publications.sql';
import { releasesTable } from './releases.sql';

export const publishersTable = pgTable(
  'publishers',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => create_prefixed_id('pub')),
    created_at: timestamp()
      .notNull()
      .default(sql`current_timestamp`),
    updated_at: timestamp()
      .notNull()
      .default(sql`current_timestamp`)
      .$onUpdate(() => new Date()),

    address: text().notNull(),
  },
  (table) => [uniqueIndex('publishers_address_unique').on(table.address)],
);

export const publishersRelations = relations(publishersTable, ({ many }) => ({
  publications: many(publicationsTable, {
    relationName: 'publisher_publications',
  }),
  releases: many(releasesTable, { relationName: 'publisher_releases' }),
}));
