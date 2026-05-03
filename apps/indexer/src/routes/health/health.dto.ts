import { Expose, Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class HealthDto {
  @Expose()
  @IsIn(['ok'])
  status: 'ok';

  @Expose()
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  backfill_completed_at: Date | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  cursor_slot: number | null;

  @Expose()
  @IsOptional()
  @IsString()
  cursor_signature: string | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  chain_slot: number | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  program_tip_slot: number | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  lag_slots: number | null;
}
