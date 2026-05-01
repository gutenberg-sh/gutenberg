import { Expose } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class StatsDto {
  @Expose()
  @IsInt()
  @Min(0)
  releases: number;

  @Expose()
  @IsInt()
  @Min(0)
  names: number;

  @Expose()
  @IsInt()
  @Min(0)
  publishers: number;
}
