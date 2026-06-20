import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
  InferInsertModel,
  Table,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { TSchema } from './schema';

export type { TSchema };

export type TTable = ExtractTablesWithRelations<TSchema>;
export type TableName = Extract<keyof TTable, string | number>;

export type Db = NodePgDatabase<TSchema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type RepositorySchema<TSchemaType extends Record<string, unknown>> =
  ExtractTablesWithRelations<TSchemaType>;

export type RepositoryTableRelation<
  TSchemaType extends Record<string, unknown>,
  TTableName extends keyof RepositorySchema<TSchemaType>,
> = RepositorySchema<TSchemaType>[TTableName];

export type QuerySelection<
  TQueryConfig extends { columns?: unknown; with?: unknown; extras?: unknown },
> = {
  columns: TQueryConfig['columns'];
  with: TQueryConfig['with'];
  extras: TQueryConfig['extras'];
};

export type RepositoryQueryConfig<
  TSchemaType extends Record<string, unknown>,
  TTableName extends keyof RepositorySchema<TSchemaType>,
> = DBQueryConfig<
  'many',
  true,
  RepositorySchema<TSchemaType>,
  RepositoryTableRelation<TSchemaType, TTableName>
>;

export type RepositoryEntity<
  TSchemaType extends Record<string, unknown>,
  TTableName extends keyof RepositorySchema<TSchemaType>,
> = BuildQueryResult<
  RepositorySchema<TSchemaType>,
  RepositoryTableRelation<TSchemaType, TTableName>,
  Record<string, never>
>;

export type RepositoryQueryEntity<
  TSchemaType extends Record<string, unknown>,
  TTableName extends keyof RepositorySchema<TSchemaType>,
  TQueryConfig extends RepositoryQueryConfig<TSchemaType, TTableName>,
> = BuildQueryResult<
  RepositorySchema<TSchemaType>,
  RepositoryTableRelation<TSchemaType, TTableName>,
  QuerySelection<TQueryConfig>
>;

export type QueryConfig<TTableName extends TableName> = RepositoryQueryConfig<
  TSchema,
  TTableName
>;

export type InferCreateModel<T extends Table> = InferInsertModel<T>;
export type InferUpdateModel<T extends Table> = Partial<InferInsertModel<T>>;
export type InferFindModel<
  TTableName extends TableName,
  TQueryConfig extends QueryConfig<TTableName> = QueryConfig<TTableName>,
> = RepositoryQueryEntity<TSchema, TTableName, TQueryConfig>;
