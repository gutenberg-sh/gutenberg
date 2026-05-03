import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { Expose, Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, Matches } from 'class-validator';

import type { Sha256Hash } from '@gutenberg/core';

import { ReleaseWithRelationsDto } from '../releases/releases.dto';

export class BaseManifestDto {
  @Expose()
  @Matches(/^man_[A-Za-z0-9_-]{21}$/)
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
  @Matches(/^rel_[A-Za-z0-9_-]{21}$/)
  release_id: string;

  @Expose()
  @IsString()
  uri: string;

  @Expose()
  @Matches(/^sha256:[0-9a-f]{64}$/)
  hash: Sha256Hash;

  @Expose()
  @Type(() => ReleaseWithRelationsDto)
  @IsOptional()
  release?: ReleaseWithRelationsDto | null;
}

export const MANIFEST_BASE_RELATIONS = ['release'] as const;
export const MANIFEST_NESTED_RELATIONS = [
  'release.publisher',
  'release.publication',
  'release.manifest',
] as const;

export const MANIFEST_RELATIONS = [
  ...MANIFEST_BASE_RELATIONS,
  ...MANIFEST_NESTED_RELATIONS,
] as const;

class WithoutRelations extends OmitType(
  BaseManifestDto,
  MANIFEST_BASE_RELATIONS,
) {}

class WithoutMeta extends OmitType(WithoutRelations, [
  'id',
  'created_at',
  'updated_at',
] as const) {}

export class ManifestDto extends WithoutRelations {}
export class ManifestWithRelationsDto extends BaseManifestDto {}

export class CreateManifestDto extends WithoutMeta {}

export class UpdateManifestDto extends PartialType(WithoutMeta) {}

export class DeleteManifestDto extends PickType(BaseManifestDto, [
  'id',
] as const) {}
