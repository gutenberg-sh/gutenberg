import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { DATABASE_URL } from '../config/config.tokens';

import { DATABASE_DB, DATABASE_POOL } from './database.tokens';
import { schema } from './schema';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [DATABASE_URL],
      useFactory: (connection_string: string) =>
        new Pool({ connectionString: connection_string }),
    },
    {
      provide: DATABASE_DB,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DATABASE_DB, DATABASE_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
