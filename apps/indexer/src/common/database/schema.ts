import {
  cursorsTable,
  manifestsRelations,
  manifestsTable,
  publicationsRelations,
  publicationsTable,
  publishersRelations,
  publishersTable,
  releasesRelations,
  releasesTable,
} from './tables';

export const schema = {
  publishersTable,
  publishersRelations,
  publicationsTable,
  publicationsRelations,
  releasesTable,
  releasesRelations,
  manifestsTable,
  manifestsRelations,
  cursorsTable,
};

export type TSchema = typeof schema;
