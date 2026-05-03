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

export class BaseCursorDto {
  @Expose()
  @Matches(/^cur_[A-Za-z0-9_-]{21}$/)
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
  scope: string;

  @Expose()
  @IsOptional()
  @IsString()
  last_signature?: string | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  last_slot?: number | null;

  @Expose()
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  backfill_completed_at?: Date | null;
}

class WithoutRelations extends BaseCursorDto {}

class WithoutMeta extends OmitType(WithoutRelations, [
  'id',
  'created_at',
  'updated_at',
] as const) {}

export class CursorDto extends WithoutRelations {}

export class CreateCursorDto extends WithoutMeta {}

export class UpdateCursorDto extends PartialType(WithoutMeta) {}

export class DeleteCursorDto extends PickType(BaseCursorDto, ['id'] as const) {}
