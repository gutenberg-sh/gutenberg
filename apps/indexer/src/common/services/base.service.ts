/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

import { InternalServerErrorException, Logger } from '@nestjs/common';
import { SQL } from 'drizzle-orm';
import type { IndexColumn } from 'drizzle-orm/pg-core';

import { InferFindModel, QueryConfig, TableName } from '../database/db.types';
import { BaseRepository } from '../repositories/base.repository';

export abstract class BaseService<
  TDto,
  TCreateDto extends object,
  TUpdateDto extends Partial<object>,
  TTableName extends TableName,
> {
  private readonly logger: Logger = new Logger(this.constructor.name);

  constructor(
    protected readonly repository: BaseRepository<any, any, TTableName>,
  ) {}

  async create(create_dto: TCreateDto): Promise<TDto> {
    try {
      return (await this.repository.create(create_dto)) as TDto;
    } catch (error) {
      throw new InternalServerErrorException('Failed to create object:', error);
    }
  }

  async create_many(create_dtos: TCreateDto[]): Promise<TDto[]> {
    try {
      return (await this.repository.create_many(create_dtos)) as TDto[];
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to create objects:',
        error,
      );
    }
  }

  async upsert(
    create_dto: TCreateDto,
    target: IndexColumn[],
    set: Partial<TCreateDto>,
  ): Promise<TDto> {
    try {
      return (await this.repository.upsert(create_dto, target, set)) as TDto;
    } catch (error) {
      throw new InternalServerErrorException('Failed to upsert object:', error);
    }
  }

  async find<TQueryConfig extends QueryConfig<TTableName>>(
    options?: TQueryConfig,
  ): Promise<InferFindModel<TTableName, TQueryConfig> | null> {
    try {
      return (await this.repository.find(options)) as InferFindModel<
        TTableName,
        TQueryConfig
      > | null;
    } catch (error) {
      throw new InternalServerErrorException('Failed to find object:', error);
    }
  }

  async find_many<TQueryConfig extends QueryConfig<TTableName>>(
    options?: TQueryConfig,
  ): Promise<InferFindModel<TTableName, TQueryConfig>[]> {
    try {
      return (await this.repository.find_many(options)) as InferFindModel<
        TTableName,
        TQueryConfig
      >[];
    } catch (error) {
      throw new InternalServerErrorException('Failed to find objects:', error);
    }
  }

  async update(id: string, update_dto: TUpdateDto): Promise<TDto> {
    try {
      return (await this.repository.update(id, update_dto)) as TDto;
    } catch (error) {
      throw new InternalServerErrorException('Failed to update object:', error);
    }
  }

  async update_many(
    update_dto: TUpdateDto,
    where: SQL<unknown> | undefined,
  ): Promise<void> {
    try {
      await this.repository.update_many(update_dto, where);
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to update objects:',
        error,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete object:', error);
    }
  }

  async delete_many(where: SQL<unknown> | undefined): Promise<void> {
    try {
      await this.repository.delete_many(where);
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete objects:',
        error,
      );
    }
  }

  async count(where: SQL<unknown> | undefined): Promise<number> {
    try {
      return await this.repository.count(where);
    } catch (error) {
      throw new InternalServerErrorException('Failed to count objects:', error);
    }
  }
}
