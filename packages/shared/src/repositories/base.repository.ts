/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */

import { Logger } from '@nestjs/common';
import { count, desc, eq, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  IndexColumn,
  PgTableWithColumns,
  PgUpdateSetSource,
} from 'drizzle-orm/pg-core';
import type {
  InferCreateModel,
  RepositoryEntity,
  RepositoryQueryConfig,
  RepositoryQueryEntity,
  RepositorySchema,
} from '@gutenberg/db';

export abstract class BaseRepository<
  TSchemaType extends Record<string, unknown>,
  TTable extends PgTableWithColumns<any>,
  TTableName extends keyof RepositorySchema<TSchemaType>,
> {
  private readonly logger: Logger = new Logger(this.constructor.name);

  constructor(
    protected readonly db: NodePgDatabase<TSchemaType>,
    protected readonly table: TTable,
    protected readonly table_name: TTableName,
  ) {}

  async create(
    data: InferCreateModel<TTable>,
  ): Promise<RepositoryEntity<TSchemaType, TTableName>> {
    try {
      const [entity] = await this.db
        .insert(this.table)
        .values(data)
        .returning();

      this.logger.log('Created entity:', entity);

      return entity as RepositoryEntity<TSchemaType, TTableName>;
    } catch (error) {
      this.logger.error('Failed to create entity:', error);
      throw error;
    }
  }

  async create_many(
    data: InferCreateModel<TTable>[],
  ): Promise<RepositoryEntity<TSchemaType, TTableName>[]> {
    try {
      const entities = await this.db
        .insert(this.table)
        .values(data)
        .returning();

      this.logger.log('Created entities:', entities.length);

      return entities as RepositoryEntity<TSchemaType, TTableName>[];
    } catch (error) {
      this.logger.error('Failed to create entities:', error);
      throw error;
    }
  }

  async upsert(
    data: InferCreateModel<TTable>,
    target: IndexColumn[],
    set: PgUpdateSetSource<TTable>,
  ): Promise<RepositoryEntity<TSchemaType, TTableName>> {
    try {
      const [entity] = await this.db
        .insert(this.table)
        .values(data)
        .onConflictDoUpdate({ target, set })
        .returning();

      this.logger.log('Upserted entity:', entity);

      return entity as RepositoryEntity<TSchemaType, TTableName>;
    } catch (error) {
      this.logger.error('Failed to upsert entity:', error);
      throw error;
    }
  }

  async find<
    TQueryConfig extends RepositoryQueryConfig<TSchemaType, TTableName>,
  >(
    options?: TQueryConfig,
  ): Promise<RepositoryQueryEntity<
    TSchemaType,
    TTableName,
    TQueryConfig
  > | null> {
    try {
      const entity = await (this.db.query as any)[this.table_name].findFirst({
        columns: options?.columns,
        with: options?.with,
        extras: options?.extras,
        where: options?.where,
        orderBy: options?.orderBy ?? desc(this.table.created_at),
      });

      this.logger.log('Found entity:', entity);

      return entity ?? null;
    } catch (error) {
      this.logger.error('Failed to find entity:', error);
      throw error;
    }
  }

  async find_many<
    TQueryConfig extends RepositoryQueryConfig<TSchemaType, TTableName>,
  >(
    options?: TQueryConfig,
  ): Promise<RepositoryQueryEntity<TSchemaType, TTableName, TQueryConfig>[]> {
    try {
      const entities = await (this.db.query as any)[this.table_name].findMany({
        columns: options?.columns,
        with: options?.with,
        extras: options?.extras,
        where: options?.where,
        orderBy: options?.orderBy ?? desc(this.table.created_at),
        limit: options?.limit,
        offset: options?.offset,
      });

      this.logger.log('Entities found:', entities.length);

      return entities;
    } catch (error) {
      this.logger.error('Failed to find entities:', error);
      throw error;
    }
  }

  async update(
    id: string,
    data: PgUpdateSetSource<TTable>,
  ): Promise<RepositoryEntity<TSchemaType, TTableName>> {
    try {
      const result = await this.db
        .update(this.table)
        .set(data)
        .where(eq(this.table.id, id))
        .returning();

      const entity = Array.isArray(result) ? result[0] : result;

      this.logger.log('Updated entity:', entity);

      return entity as RepositoryEntity<TSchemaType, TTableName>;
    } catch (error) {
      this.logger.error('Failed to update entity:', error);
      throw error;
    }
  }

  async update_many(
    data: PgUpdateSetSource<TTable>,
    where: SQL<unknown> | undefined,
  ): Promise<RepositoryEntity<TSchemaType, TTableName>[]> {
    try {
      const result = await this.db
        .update(this.table)
        .set(data)
        .where(where)
        .returning();

      const entities = Array.isArray(result) ? result : [result];

      this.logger.log('Updated multiple entities');

      return entities as RepositoryEntity<TSchemaType, TTableName>[];
    } catch (error) {
      this.logger.error('Failed to update entities:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(this.table).where(eq(this.table.id, id));

      this.logger.log('Deleted entity:', id);
    } catch (error) {
      this.logger.error('Failed to delete entity:', error);
      throw error;
    }
  }

  async delete_many(where: SQL<unknown> | undefined): Promise<void> {
    try {
      await this.db.delete(this.table).where(where);

      this.logger.log('Deleted multiple entities');
    } catch (error) {
      this.logger.error('Failed to delete entities:', error);
      throw error;
    }
  }

  async count(where: SQL<unknown> | undefined): Promise<number> {
    try {
      const [result] = await this.db
        .select({ count: count() })
        .from(this.table as PgTableWithColumns<any>)
        .where(where);

      this.logger.log('Count result:', result?.count);

      return result?.count ?? 0;
    } catch (error) {
      this.logger.error('Failed to count entities:', error);
      throw error;
    }
  }
}
