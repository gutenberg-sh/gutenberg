import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { GUTENBERG_REGISTRY_PROGRAM_ID } from '@gutenberg/core';
import { cursorsTable } from '../../common/database/tables';
import { SerializeWith } from '../../common/decorators/serialize-with.decorator';
import { SerializationInterceptor } from '../../common/interceptors/serialization.interceptor';
import { CursorService } from '../../modules/ingestion/cursor.service';
import { RELEASES_CURSOR_SCOPE } from '../../modules/ingestion/ingest.types';
import { SolanaRpcClient } from '../../modules/ingestion/solana-rpc.client';

import { HealthDto } from './health.dto';

@Controller('health')
@UseInterceptors(SerializationInterceptor)
export class HealthController {
  constructor(
    private readonly cursor_service: CursorService,
    private readonly rpc: SolanaRpcClient,
  ) {}

  @Get()
  @SerializeWith(HealthDto)
  async get_health(): Promise<HealthDto> {
    const cursor = await this.cursor_service.find({
      where: eq(cursorsTable.scope, RELEASES_CURSOR_SCOPE),
    });

    let chain_slot: number | null = null;
    /** Slot of the newest chain tx involving the registry program (not global chain tip). */
    let program_tip_slot: number | null = null;
    let lag_slots: number | null = null;

    try {
      chain_slot = await this.rpc.get_slot();

      const tip_sigs = await this.rpc.get_signatures_for_address({
        address: GUTENBERG_REGISTRY_PROGRAM_ID,
        limit: 1,
      });
      program_tip_slot = tip_sigs[0]?.slot ?? null;

      /*
       * Lag vs newest *program* tx (not global chain tip; empty slots used to inflate lag).
       * - No signatures: vacuously caught up (lag 0).
       * - Cursor without last_slot (e.g. row created only with backfill_completed_at):
       *   still compute lag vs tip so the UI is not stuck on "syncing".
       */
      if (program_tip_slot == null) {
        lag_slots = 0;
      } else if (cursor?.last_slot == null) {
        lag_slots = program_tip_slot;
      } else {
        lag_slots = Math.max(0, program_tip_slot - cursor.last_slot);
      }
    } catch {
      /* tolerate RPC failures in health check */
    }

    return {
      status: 'ok',
      backfill_completed_at: cursor?.backfill_completed_at ?? null,
      cursor_slot: cursor?.last_slot ?? null,
      cursor_signature: cursor?.last_signature ?? null,
      chain_slot,
      program_tip_slot,
      lag_slots,
    };
  }
}
