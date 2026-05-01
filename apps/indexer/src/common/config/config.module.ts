import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { config as load_dotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { env } from '../../env';

import {
  BACKFILL_BATCH_SIZE,
  BACKFILL_TX_CONCURRENCY,
  DATABASE_URL,
  NODE_ENV,
  PORT,
  PROGRAM_ID,
  RECONCILE_LOOKBACK_SLOTS,
  SOLANA_RPC_URL,
  SOLANA_WS_URL,
} from './config.tokens';

const env_file_path = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '..', '.env'),
].find((path) => existsSync(path));

load_dotenv({ path: env_file_path, quiet: true });

function derive_ws_url(http_url: string): string {
  const url = new URL(http_url);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  // Solana's local validator exposes JSON-RPC on 8899 and WebSocket on 8900.
  // Managed providers (Helius, QuickNode, Triton, etc.) multiplex HTTP+WS on
  // the same port, so we only bump for explicit local hosts.
  const is_local = ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  if (is_local && url.port === '8899') {
    url.port = '8900';
  }

  return url.toString();
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: env_file_path,
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
      provide: PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<number>('GUTENBERG_INDEXER_PORT'),
    },
    {
      provide: DATABASE_URL,
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
      useFactory: (config: ConfigService) => {
        const explicit = config.get<string>('GUTENBERG_INDEXER_SOLANA_WS_URL');

        if (explicit && explicit.length > 0) {
          return explicit;
        }

        return derive_ws_url(
          config.getOrThrow<string>('GUTENBERG_INDEXER_SOLANA_RPC_URL'),
        );
      },
    },
    {
      provide: PROGRAM_ID,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_INDEXER_PROGRAM_ID'),
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
    {
      provide: RECONCILE_LOOKBACK_SLOTS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<number>('GUTENBERG_INDEXER_RECONCILE_LOOKBACK_SLOTS'),
    },
  ],
  exports: [
    NestConfigModule,
    NODE_ENV,
    PORT,
    DATABASE_URL,
    SOLANA_RPC_URL,
    SOLANA_WS_URL,
    PROGRAM_ID,
    BACKFILL_BATCH_SIZE,
    BACKFILL_TX_CONCURRENCY,
    RECONCILE_LOOKBACK_SLOTS,
  ],
})
export class ConfigModule {}
