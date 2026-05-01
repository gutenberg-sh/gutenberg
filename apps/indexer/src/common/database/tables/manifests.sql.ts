import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { sha256_hash } from '../columns/sha256-hash';
import { create_prefixed_id } from '../id';

import { releasesTable } from './releases.sql';

export const manifestsTable = pgTable(
  'manifests',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => create_prefixed_id('man')),
    created_at: timestamp()
      .notNull()
      .default(sql`current_timestamp`),
    updated_at: timestamp()
      .notNull()
      .default(sql`current_timestamp`)
      .$onUpdate(() => new Date()),

    release_id: text()
      .notNull()
      .references(() => releasesTable.id, { onDelete: 'cascade' }),

    uri: text().notNull(),
    hash: sha256_hash().notNull(),
  },
  (table) => [uniqueIndex('manifests_release_id_unique').on(table.release_id)],
);

export const manifestsRelations = relations(manifestsTable, ({ one }) => ({
  release: one(releasesTable, {
    fields: [manifestsTable.release_id],
    references: [releasesTable.id],
    relationName: 'release_manifest',
  }),
}));
