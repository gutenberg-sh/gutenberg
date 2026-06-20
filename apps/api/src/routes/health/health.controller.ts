import { Controller, Get, Inject, UseInterceptors } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE_DB, type Db } from '@gutenberg/db';

import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';

import { HealthDto } from './health.dto';

@Controller('health')
@UseInterceptors(SerializationInterceptor)
export class HealthController {
  constructor(@Inject(DATABASE_DB) private readonly db: Db) {}

  @Get()
  @SerializeWith(HealthDto)
  async get_health(): Promise<HealthDto> {
    await this.db.execute(sql`SELECT 1`);
    return { status: 'ok' };
  }
}
