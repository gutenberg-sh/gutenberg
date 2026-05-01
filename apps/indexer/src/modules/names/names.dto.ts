import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString, Matches } from 'class-validator';

import { PublisherWithRelationsDto } from '../publishers/publishers.dto';
import { ReleaseWithRelationsDto } from '../releases/releases.dto';

export class BaseNameDto {
  @Expose()
  @Matches(/^nam_[A-Za-z0-9_-]{21}$/)
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
  @IsString()
  address: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @Type(() => PublisherWithRelationsDto)
  @IsOptional()
  publisher?: PublisherWithRelationsDto | null;

  @Expose()
  @Type(() => ReleaseWithRelationsDto)
  @IsArray()
  @IsOptional()
  releases?: ReleaseWithRelationsDto[];
}

export const NAME_BASE_RELATIONS = ['publisher', 'releases'] as const;
export const NAME_NESTED_RELATIONS = [
  'publisher.names',
  'publisher.releases',
  'releases.publisher',
  'releases.name',
  'releases.manifest',
] as const;

export const NAME_RELATIONS = [
  ...NAME_BASE_RELATIONS,
  ...NAME_NESTED_RELATIONS,
] as const;

class WithoutRelations extends OmitType(BaseNameDto, NAME_BASE_RELATIONS) {}

class WithoutMeta extends OmitType(WithoutRelations, [
  'id',
  'created_at',
  'updated_at',
] as const) {}

export class NameDto extends WithoutRelations {}
export class NameWithRelationsDto extends BaseNameDto {}

export class CreateNameDto extends WithoutMeta {}

export class UpdateNameDto extends PartialType(WithoutMeta) {}

export class DeleteNameDto extends PickType(BaseNameDto, ['id'] as const) {}
