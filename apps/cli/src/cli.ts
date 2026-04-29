#!/usr/bin/env node

import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { CliService } from './cli/cli.service';

void main();

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    await app.get(CliService).run();
  } finally {
    await app.close();
  }
}
