import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { eq } from 'drizzle-orm';

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
    let lag_slots: number | null = null;

    try {
      chain_slot = await this.rpc.get_slot();
      if (chain_slot !== null && cursor?.last_slot != null) {
        lag_slots = Math.max(0, chain_slot - cursor.last_slot);
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
      lag_slots,
    };
  }
}
