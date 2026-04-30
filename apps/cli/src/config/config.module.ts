import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { config as load_dotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { env } from '../env';
import {
  ARWEAVE_GATEWAY_URL_KEY,
  IRYS_NETWORK_KEY,
  SOLANA_PRIVATE_KEY_KEY,
  SOLANA_RPC_URL_KEY,
} from './config.symbols';

const envFilePath = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '..', '.env'),
].find((path) => existsSync(path));

load_dotenv({ path: envFilePath, quiet: true });

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath,
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
      provide: ARWEAVE_GATEWAY_URL_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_ARWEAVE_GATEWAY'),
    },
    {
      provide: IRYS_NETWORK_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<'mainnet' | 'devnet'>('GUTENBERG_IRYS_NETWORK'),
    },
    {
      provide: SOLANA_RPC_URL_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_SOLANA_RPC_URL'),
    },
    {
      provide: SOLANA_PRIVATE_KEY_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_SOLANA_PRIVATE_KEY'),
    },
  ],
  exports: [
    NestConfigModule,
    ARWEAVE_GATEWAY_URL_KEY,
    IRYS_NETWORK_KEY,
    SOLANA_PRIVATE_KEY_KEY,
    SOLANA_RPC_URL_KEY,
  ],
})
export class ConfigModule {}
