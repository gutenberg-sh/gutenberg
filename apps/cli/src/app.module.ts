import { Module } from '@nestjs/common';

import { ConfigModule } from './common/config/config.module';
import { CliModule } from './modules/cli/cli.module';

@Module({
  imports: [ConfigModule, CliModule],
})
export class AppModule {}
