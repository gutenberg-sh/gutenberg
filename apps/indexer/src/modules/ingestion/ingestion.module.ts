import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../common/database/database.module';
import { HealthController } from '../../routes/health/health.controller';
import { ManifestsModule } from '../manifests/manifests.module';
import { NamesModule } from '../names/names.module';
import { PublishersModule } from '../publishers/publishers.module';
import { ReleasesModule } from '../releases/releases.module';

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
    NamesModule,
    ReleasesModule,
    ManifestsModule,
  ],
  controllers: [HealthController],
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
