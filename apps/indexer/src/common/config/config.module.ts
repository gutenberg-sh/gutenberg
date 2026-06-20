import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { DATABASE_URL as DB_DATABASE_URL } from '@gutenberg/db';

import { env } from '../../env';
import { load_env_file, resolve_env_file_path } from '../../env-file';

import {
  BACKFILL_BATCH_SIZE,
  BACKFILL_TX_CONCURRENCY,
  DATABASE_URL,
  NODE_ENV,
  SOLANA_RPC_URL,
  SOLANA_WS_URL,
} from './config.tokens';

load_env_file();

const env_file_path = resolve_env_file_path();

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      ...(env_file_path ? { envFilePath: env_file_path } : {}),
      isGlobal: true,
      validate: (values: Record<string, unknown>) => {
        try {
          return env.parse(values);
        } catch (error) {
          console.error('Invalid/missing environment variables');
          throw error;
        }
      },
    }),
  ],
  providers: [
    {
      provide: NODE_ENV,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<'development' | 'production'>(
          'GUTENBERG_INDEXER_NODE_ENV',
        ),
    },
    {
      provide: DATABASE_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_INDEXER_DATABASE_URL'),
    },
    {
      provide: DB_DATABASE_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_INDEXER_DATABASE_URL'),
    },
    {
      provide: SOLANA_RPC_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_INDEXER_SOLANA_RPC_URL'),
    },
    {
      provide: SOLANA_WS_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_INDEXER_SOLANA_WS_URL'),
    },
    {
      provide: BACKFILL_BATCH_SIZE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<number>('GUTENBERG_INDEXER_BACKFILL_BATCH_SIZE'),
    },
    {
      provide: BACKFILL_TX_CONCURRENCY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<number>('GUTENBERG_INDEXER_BACKFILL_TX_CONCURRENCY'),
    },
  ],
  exports: [
    NestConfigModule,
    NODE_ENV,
    DATABASE_URL,
    DB_DATABASE_URL,
    SOLANA_RPC_URL,
    SOLANA_WS_URL,
    BACKFILL_BATCH_SIZE,
    BACKFILL_TX_CONCURRENCY,
  ],
})
export class ConfigModule {}
