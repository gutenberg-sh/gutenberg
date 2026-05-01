import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { sha256_hash } from '../columns/sha256-hash';
import { create_prefixed_id } from '../id';

import { manifestsTable } from './manifests.sql';
import { namesTable } from './names.sql';
import { publishersTable } from './publishers.sql';

export const releasesTable = pgTable(
  'releases',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => create_prefixed_id('rel')),
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
    name_id: text()
      .notNull()
      .references(() => namesTable.id, { onDelete: 'cascade' }),

    address: text().notNull(),
    version: text().notNull(),
    schema_version: smallint().notNull(),
    content_hash: sha256_hash().notNull(),
    content_size_bytes: bigint({ mode: 'number' }).notNull(),
    signature: text().notNull(),
    published_at: timestamp().notNull(),
  },
  (table) => [
    uniqueIndex('releases_address_unique').on(table.address),
    uniqueIndex('releases_name_id_version_unique').on(
      table.name_id,
      table.version,
    ),
    index('releases_publisher_id_idx').on(table.publisher_id),
    index('releases_name_id_idx').on(table.name_id),
    index('releases_published_at_desc_idx').on(table.published_at.desc()),
  ],
);

export const releasesRelations = relations(releasesTable, ({ one }) => ({
  publisher: one(publishersTable, {
    fields: [releasesTable.publisher_id],
    references: [publishersTable.id],
    relationName: 'publisher_releases',
  }),
  name: one(namesTable, {
    fields: [releasesTable.name_id],
    references: [namesTable.id],
    relationName: 'name_releases',
  }),
  manifest: one(manifestsTable, {
    fields: [releasesTable.id],
    references: [manifestsTable.release_id],
    relationName: 'release_manifest',
  }),
}));
