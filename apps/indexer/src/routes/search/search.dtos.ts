import { IntersectionType } from '@nestjs/mapped-types';
import { Expose } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

import { PaginationOptionsDto } from '../../common/dtos/pagination-options.dto';

class SearchNamesQueryFields {
  @Expose()
  @IsString()
  @MinLength(1)
  q: string;
}

export class SearchNamesRequestDto extends IntersectionType(
  SearchNamesQueryFields,
  PaginationOptionsDto,
) {}
