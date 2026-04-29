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
  REGISTRY_PROGRAM_ID_KEY,
  SOLANA_PRIVATE_KEY_KEY,
  SOLANA_RPC_URL_KEY,
  STORAGE_ACCESS_KEY_KEY,
  STORAGE_BUCKET_KEY,
  STORAGE_ENDPOINT_KEY,
  STORAGE_SECRET_KEY_KEY,
} from './config.symbols';

const envFilePath = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '..', '.env'),
].find((path) => existsSync(path));

load_dotenv({ path: envFilePath });

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
      provide: STORAGE_ENDPOINT_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('VERITAS_STORAGE_ENDPOINT'),
    },
    {
      provide: STORAGE_BUCKET_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('VERITAS_STORAGE_BUCKET'),
    },
    {
      provide: STORAGE_ACCESS_KEY_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('VERITAS_STORAGE_ACCESS_KEY'),
    },
    {
      provide: STORAGE_SECRET_KEY_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('VERITAS_STORAGE_SECRET_KEY'),
    },
    {
      provide: SOLANA_RPC_URL_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('VERITAS_SOLANA_RPC_URL'),
    },
    {
      provide: SOLANA_PRIVATE_KEY_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('VERITAS_SOLANA_PRIVATE_KEY'),
    },
    {
      provide: REGISTRY_PROGRAM_ID_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('VERITAS_REGISTRY_PROGRAM_ID'),
    },
  ],
  exports: [
    NestConfigModule,
    STORAGE_ENDPOINT_KEY,
    STORAGE_BUCKET_KEY,
    STORAGE_ACCESS_KEY_KEY,
    STORAGE_SECRET_KEY_KEY,
    SOLANA_PRIVATE_KEY_KEY,
    SOLANA_RPC_URL_KEY,
    REGISTRY_PROGRAM_ID_KEY,
  ],
})
export class ConfigModule {}
