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
import { publicationsTable } from './publications.sql';
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
    publication_id: text()
      .notNull()
      .references(() => publicationsTable.id, { onDelete: 'cascade' }),

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
    uniqueIndex('releases_publication_id_version_unique').on(
      table.publication_id,
      table.version,
    ),
    index('releases_publisher_id_idx').on(table.publisher_id),
    index('releases_publication_id_idx').on(table.publication_id),
    index('releases_published_at_desc_idx').on(table.published_at.desc()),
  ],
);

export const releasesRelations = relations(releasesTable, ({ one }) => ({
  publisher: one(publishersTable, {
    fields: [releasesTable.publisher_id],
    references: [publishersTable.id],
    relationName: 'publisher_releases',
  }),
  publication: one(publicationsTable, {
    fields: [releasesTable.publication_id],
    references: [publicationsTable.id],
    relationName: 'publication_releases',
  }),
  manifest: one(manifestsTable, {
    fields: [releasesTable.id],
    references: [manifestsTable.release_id],
    relationName: 'release_manifest',
  }),
}));
