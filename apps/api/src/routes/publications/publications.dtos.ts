import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class GetPublicationRequestDto {
  @Expose()
  @IsString()
  registry_id: string;
}
