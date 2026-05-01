#!/usr/bin/env node

import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ui } from './common/helpers/ui';
import { CliService } from './modules/cli/cli.service';

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  ui.error(message);

  if (process.env.GUTENBERG_DEBUG && error instanceof Error && error.stack) {
    ui.writeln(`\n${error.stack}`);
  }

  process.exit(1);
});

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });

  try {
    await app.get(CliService).run();
  } finally {
    await app.close();
  }
}
