import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { CORS_CONFIG } from './cors.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const environment = config.getOrThrow<'development' | 'production'>(
    'GUTENBERG_INDEXER_NODE_ENV',
  );

  const express_app = app.getHttpAdapter().getInstance();
  express_app.set('trust proxy', true);
  express_app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      strictTransportSecurity: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  app.enableCors(CORS_CONFIG[environment]);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('GUTENBERG_INDEXER_PORT');
  await app.listen(port);

  console.log(`Gutenberg indexer listening on port ${port}`);
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start Gutenberg indexer:', error);
  process.exit(1);
});
