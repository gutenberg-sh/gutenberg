import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableShutdownHooks();

  console.log('Gutenberg indexer worker started');
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start Gutenberg indexer worker:', error);
  process.exit(1);
});
