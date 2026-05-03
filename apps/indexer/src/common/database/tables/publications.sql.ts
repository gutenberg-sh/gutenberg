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

export const publicationsTable = pgTable(
  'publications',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => create_prefixed_id('prt')),
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
    registry_id: text().notNull(),
  },
  (table) => [
    uniqueIndex('publications_address_unique').on(table.address),
    uniqueIndex('publications_registry_id_unique').on(table.registry_id),
    index('publications_registry_id_trgm_idx').using(
      'gin',
      sql`${table.registry_id} gin_trgm_ops`,
    ),
  ],
);

export const publicationsRelations = relations(
  publicationsTable,
  ({ one, many }) => ({
    publisher: one(publishersTable, {
      fields: [publicationsTable.publisher_id],
      references: [publishersTable.id],
      relationName: 'publisher_publications',
    }),
    releases: many(releasesTable, { relationName: 'publication_releases' }),
  }),
);
