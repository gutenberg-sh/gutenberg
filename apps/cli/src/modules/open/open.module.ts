import { Module } from '@nestjs/common';

import { OpenCommand } from './open.command';

@Module({
  providers: [OpenCommand],
  exports: [OpenCommand],
})
export class OpenModule {}
