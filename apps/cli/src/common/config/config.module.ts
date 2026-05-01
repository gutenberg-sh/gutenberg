import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { config as load_dotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { env } from '../../env';
import { type IrysNetwork } from '../helpers/gateway-list';

import { IRYS_GATEWAY_BY_NETWORK } from './defaults';
import {
  GATEWAY_URL,
  IRYS_GATEWAY_URL,
  IRYS_NETWORK,
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
      provide: IRYS_GATEWAY_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): string => {
        const explicit = config.get<string>('GUTENBERG_CLI_IRYS_GATEWAY');

        if (explicit && explicit.length > 0) {
          return explicit.replace(/\/$/, '');
        }

        const network = config.getOrThrow<IrysNetwork>(
          'GUTENBERG_CLI_IRYS_NETWORK',
        );

        return IRYS_GATEWAY_BY_NETWORK[network];
      },
    },
    {
      provide: IRYS_NETWORK,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<IrysNetwork>('GUTENBERG_CLI_IRYS_NETWORK'),
    },
    {
      provide: SOLANA_RPC_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_CLI_SOLANA_RPC_URL'),
    },
    {
      provide: GATEWAY_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('GUTENBERG_CLI_GATEWAY_URL'),
    },
  ],
  exports: [
    NestConfigModule,
    GATEWAY_URL,
    IRYS_GATEWAY_URL,
    IRYS_NETWORK,
    SOLANA_RPC_URL,
  ],
})
export class ConfigModule {}
