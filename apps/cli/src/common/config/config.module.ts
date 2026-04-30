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
  ARWEAVE_GATEWAY_URL,
  GATEWAY_URL,
  IRYS_NETWORK,
  SOLANA_PRIVATE_KEY,
  SOLANA_RPC_URL,
} from './config.tokens';

const env_file_path = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '..', '.env'),
].find((path) => existsSync(path));

load_dotenv({ path: env_file_path, quiet: true });

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
      provide: ARWEAVE_GATEWAY_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_ARWEAVE_GATEWAY'),
    },
    {
      provide: IRYS_NETWORK,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<'mainnet' | 'devnet'>('GUTENBERG_IRYS_NETWORK'),
    },
    {
      provide: SOLANA_RPC_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_SOLANA_RPC_URL'),
    },
    {
      provide: SOLANA_PRIVATE_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_SOLANA_PRIVATE_KEY'),
    },
    {
      provide: GATEWAY_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_GATEWAY_URL'),
    },
  ],
  exports: [
    NestConfigModule,
    ARWEAVE_GATEWAY_URL,
    GATEWAY_URL,
    IRYS_NETWORK,
    SOLANA_PRIVATE_KEY,
    SOLANA_RPC_URL,
  ],
})
export class ConfigModule {}
