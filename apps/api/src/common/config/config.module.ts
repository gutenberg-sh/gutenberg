import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { DATABASE_URL as DB_DATABASE_URL } from '@gutenberg/db';

import { env } from '../../env';
import { load_env_file, resolve_env_file_path } from '../../env-file';

import { DATABASE_URL, NODE_ENV, PORT } from './config.tokens';

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
          'GUTENBERG_API_NODE_ENV',
        ),
    },
    {
      provide: PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<number>('GUTENBERG_API_PORT'),
    },
    {
      provide: DATABASE_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_API_DATABASE_URL'),
    },
    {
      provide: DB_DATABASE_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_API_DATABASE_URL'),
    },
  ],
  exports: [
    NestConfigModule,
    NODE_ENV,
    PORT,
    DATABASE_URL,
    DB_DATABASE_URL,
  ],
})
export class ConfigModule {}
