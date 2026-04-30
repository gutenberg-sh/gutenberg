import { Module } from '@nestjs/common';

import { LocalSiteGatewayService } from './local-site-gateway.service';
import { MarkdownRenderService } from './markdown-render.service';

@Module({
  providers: [MarkdownRenderService, LocalSiteGatewayService],
  exports: [LocalSiteGatewayService],
})
export class GatewayModule {}
