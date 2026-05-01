import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { Expose, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

import type { Sha256Hash } from '@gutenberg/core';

import { ManifestWithRelationsDto } from '../manifests/manifests.dto';
import { NameWithRelationsDto } from '../names/names.dto';
import { PublisherWithRelationsDto } from '../publishers/publishers.dto';

export class BaseReleaseDto {
  @Expose()
  @Matches(/^rel_[A-Za-z0-9_-]{21}$/)
  id: string;

  @Expose()
  @Type(() => Date)
  @IsDate()
  created_at: Date;

  @Expose()
  @Type(() => Date)
  @IsDate()
  updated_at: Date;

  @Expose()
  @Matches(/^pub_[A-Za-z0-9_-]{21}$/)
  publisher_id: string;

  @Expose()
  @Matches(/^nam_[A-Za-z0-9_-]{21}$/)
  name_id: string;

  @Expose()
  @IsString()
  address: string;

  @Expose()
  @IsString()
  version: string;

  @Expose()
  @IsInt()
  @Min(0)
  schema_version: number;

  @Expose()
  @Matches(/^sha256:[0-9a-f]{64}$/)
  content_hash: Sha256Hash;

  @Expose()
  @IsInt()
  @Min(0)
  content_size_bytes: number;

  @Expose()
  @IsString()
  signature: string;

  @Expose()
  @Type(() => Date)
  @IsDate()
  published_at: Date;

  @Expose()
  @Type(() => PublisherWithRelationsDto)
  @IsOptional()
  publisher?: PublisherWithRelationsDto | null;

  @Expose()
  @Type(() => NameWithRelationsDto)
  @IsOptional()
  name?: NameWithRelationsDto | null;

  @Expose()
  @Type(() => ManifestWithRelationsDto)
  @IsOptional()
  manifest?: ManifestWithRelationsDto | null;
}

export const RELEASE_BASE_RELATIONS = [
  'publisher',
  'name',
  'manifest',
] as const;
export const RELEASE_NESTED_RELATIONS = [
  'publisher.names',
  'publisher.releases',
  'name.publisher',
  'name.releases',
  'manifest.release',
] as const;

export const RELEASE_RELATIONS = [
  ...RELEASE_BASE_RELATIONS,
  ...RELEASE_NESTED_RELATIONS,
] as const;

class WithoutRelations extends OmitType(
  BaseReleaseDto,
  RELEASE_BASE_RELATIONS,
) {}

class WithoutMeta extends OmitType(WithoutRelations, [
  'id',
  'created_at',
  'updated_at',
] as const) {}

export class ReleaseDto extends WithoutRelations {}
export class ReleaseWithRelationsDto extends BaseReleaseDto {}

export class CreateReleaseDto extends WithoutMeta {}

export class UpdateReleaseDto extends PartialType(WithoutMeta) {}

export class DeleteReleaseDto extends PickType(BaseReleaseDto, [
  'id',
] as const) {}
