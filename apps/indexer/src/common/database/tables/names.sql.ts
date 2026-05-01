import { relations, sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { create_prefixed_id } from '../id';

import { publishersTable } from './publishers.sql';
import { releasesTable } from './releases.sql';

export const namesTable = pgTable(
  'names',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => create_prefixed_id('nam')),
    created_at: timestamp()
      .notNull()
      .default(sql`current_timestamp`),
    updated_at: timestamp()
      .notNull()
      .default(sql`current_timestamp`)
      .$onUpdate(() => new Date()),

    publisher_id: text()
      .notNull()
      .references(() => publishersTable.id, { onDelete: 'cascade' }),

    address: text().notNull(),
    name: text().notNull(),
  },
  (table) => [
    uniqueIndex('names_address_unique').on(table.address),
    uniqueIndex('names_name_unique').on(table.name),
    index('names_name_trgm_idx').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
    ),
  ],
);

export const namesRelations = relations(namesTable, ({ one, many }) => ({
  publisher: one(publishersTable, {
    fields: [namesTable.publisher_id],
    references: [publishersTable.id],
    relationName: 'publisher_names',
  }),
  releases: many(releasesTable, { relationName: 'name_releases' }),
}));
