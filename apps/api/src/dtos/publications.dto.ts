import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { PublisherWithRelationsDto } from './publishers.dto';
import { ReleaseWithRelationsDto } from './releases.dto';

export class BasePublicationDto {
  @Expose()
  @Matches(/^prt_[A-Za-z0-9_-]{21}$/)
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
  registry_id: string;

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

export const PUBLICATION_BASE_RELATIONS = ['publisher', 'releases'] as const;
export const PUBLICATION_NESTED_RELATIONS = [
  'publisher.publications',
  'publisher.releases',
  'releases.publisher',
  'releases.publication',
  'releases.manifest',
] as const;

export const PUBLICATION_RELATIONS = [
  ...PUBLICATION_BASE_RELATIONS,
  ...PUBLICATION_NESTED_RELATIONS,
] as const;

class WithoutRelations extends OmitType(
  BasePublicationDto,
  PUBLICATION_BASE_RELATIONS,
) {}

class WithoutMeta extends OmitType(WithoutRelations, [
  'id',
  'created_at',
  'updated_at',
] as const) {}

export class PublicationDto extends WithoutRelations {}
export class PublicationWithRelationsDto extends BasePublicationDto {}

export class CreatePublicationDto extends WithoutMeta {}

export class UpdatePublicationDto extends PartialType(WithoutMeta) {}

export class DeletePublicationDto extends PickType(BasePublicationDto, [
  'id',
] as const) {}
