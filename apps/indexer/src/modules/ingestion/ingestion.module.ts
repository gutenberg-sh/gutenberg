import { Module } from '@nestjs/common';
import { DatabaseModule } from '@gutenberg/db';
import {
  ManifestsModule,
  PublicationsModule,
  PublishersModule,
  ReleasesModule,
} from '@gutenberg/shared';

import { BackfillService } from './backfill.service';
import { CursorRepository } from './cursor.repository';
import { CursorService } from './cursor.service';
import { IngestService } from './ingest.service';
import { ReconcileService } from './reconcile.service';
import { SolanaRpcClient } from './solana-rpc.client';
import { StreamService } from './stream.service';

@Module({
  imports: [
    DatabaseModule,
    PublishersModule,
    PublicationsModule,
    ReleasesModule,
    ManifestsModule,
  ],
  providers: [
    SolanaRpcClient,
    CursorRepository,
    CursorService,
    IngestService,
    BackfillService,
    StreamService,
    ReconcileService,
  ],
  exports: [SolanaRpcClient, CursorRepository, CursorService, IngestService],
})
export class IngestionModule {}
