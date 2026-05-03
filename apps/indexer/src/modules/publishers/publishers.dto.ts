import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { PublicationWithRelationsDto } from '../publications/publications.dto';
import { ReleaseWithRelationsDto } from '../releases/releases.dto';

export class BasePublisherDto {
  @Expose()
  @Matches(/^pub_[A-Za-z0-9_-]{21}$/)
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
  @IsString()
  address: string;

  @Expose()
  @Type(() => PublicationWithRelationsDto)
  @IsArray()
  @IsOptional()
  publications?: PublicationWithRelationsDto[];

  @Expose()
  @Type(() => ReleaseWithRelationsDto)
  @IsArray()
  @IsOptional()
  releases?: ReleaseWithRelationsDto[];
}

export const PUBLISHER_BASE_RELATIONS = ['publications', 'releases'] as const;
export const PUBLISHER_NESTED_RELATIONS = [
  'publications.publisher',
  'publications.releases',
  'releases.publisher',
  'releases.publication',
  'releases.manifest',
] as const;

export const PUBLISHER_RELATIONS = [
  ...PUBLISHER_BASE_RELATIONS,
  ...PUBLISHER_NESTED_RELATIONS,
] as const;

class WithoutRelations extends OmitType(
  BasePublisherDto,
  PUBLISHER_BASE_RELATIONS,
) {}

class WithoutMeta extends OmitType(WithoutRelations, [
  'id',
  'created_at',
  'updated_at',
] as const) {}

export class PublisherDto extends WithoutRelations {}
export class PublisherWithRelationsDto extends BasePublisherDto {}

export class CreatePublisherDto extends WithoutMeta {}

export class UpdatePublisherDto extends PartialType(WithoutMeta) {}

export class DeletePublisherDto extends PickType(BasePublisherDto, [
  'id',
] as const) {}
