import {
  cursorsTable,
  manifestsRelations,
  manifestsTable,
  namesRelations,
  namesTable,
  publishersRelations,
  publishersTable,
  releasesRelations,
  releasesTable,
} from './tables';

export const schema = {
  publishersTable,
  publishersRelations,
  namesTable,
  namesRelations,
  releasesTable,
  releasesRelations,
  manifestsTable,
  manifestsRelations,
  cursorsTable,
};

export type TSchema = typeof schema;
