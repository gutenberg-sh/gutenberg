import { Expose } from 'class-transformer';
import { IsIn } from 'class-validator';

export class HealthDto {
  @Expose()
  @IsIn(['ok'])
  status: 'ok';
}
