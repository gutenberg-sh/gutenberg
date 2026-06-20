import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class GetReleaseRequestDto {
  @Expose()
  @IsString()
  address: string;
}
