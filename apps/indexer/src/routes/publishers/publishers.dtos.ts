import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class GetPublisherRequestDto {
  @Expose()
  @IsString()
  address: string;
}
