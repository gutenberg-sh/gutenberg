import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { GUTENBERG_REGISTRY_PROGRAM_ID } from '@gutenberg/core';

import {
  BACKFILL_BATCH_SIZE,
  BACKFILL_TX_CONCURRENCY,
} from '../../common/config/config.tokens';
import { cursorsTable } from '@gutenberg/db';

import { CursorService } from './cursor.service';
import { IngestService } from './ingest.service';
import { RELEASES_CURSOR_SCOPE } from './ingest.types';
import { SolanaRpcClient } from './solana-rpc.client';

@Injectable()
export class BackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BackfillService.name);
  private running = false;

  constructor(
    @Inject(BACKFILL_BATCH_SIZE) private readonly batch_size: number,
    @Inject(BACKFILL_TX_CONCURRENCY)
    private readonly tx_concurrency: number,
    private readonly rpc: SolanaRpcClient,
    private readonly ingest: IngestService,
    private readonly cursor_service: CursorService,
  ) {}

  onApplicationBootstrap(): void {
    void this.run_initial_backfill();
  }

  async run_initial_backfill(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const cursor = await this.cursor_service.find({
        where: eq(cursorsTable.scope, RELEASES_CURSOR_SCOPE),
      });

      if (cursor?.backfill_completed_at) {
        this.logger.log(
          `Backfill previously completed at ${cursor.backfill_completed_at.toISOString()}; skipping initial backfill`,
        );
        return;
      }

      this.logger.log('Starting initial backfill of program signatures');
      await this.run_full_backfill();
      await this.mark_backfill_completed();
      this.logger.log('Initial backfill complete');
    } catch (error) {
      this.logger.error('Initial backfill failed', error);
    } finally {
      this.running = false;
    }
  }

  async run_full_backfill(): Promise<void> {
    let before: string | undefined;
    let total_signatures = 0;
    let total_releases = 0;

    while (true) {
      const signatures = await this.rpc.get_signatures_for_address({
        address: GUTENBERG_REGISTRY_PROGRAM_ID,
        limit: this.batch_size,
        ...(before ? { before } : {}),
      });

      if (signatures.length === 0) {
        break;
      }

      total_signatures += signatures.length;

      const result = await this.process_signature_batch(
        signatures.map((sig) => sig.signature),
      );
      total_releases += result.releases_indexed;

      const oldest = signatures[signatures.length - 1];
      const newest = signatures[0];
      before = oldest.signature;

      this.logger.log(
        `Backfilled batch: ${signatures.length} signatures, ${result.releases_indexed} new releases (total: ${total_signatures} sigs, ${total_releases} releases)`,
      );

      await this.write_cursor({
        last_signature: newest.signature,
        last_slot: newest.slot,
      });

      if (signatures.length < this.batch_size) {
        break;
      }
    }

    this.logger.log(
      `Backfill scanned ${total_signatures} signatures, ingested ${total_releases} releases`,
    );
  }

  async backfill_recent(input: {
    until_signature?: string;
  }): Promise<{ signatures_seen: number; releases_indexed: number }> {
    let before: string | undefined;
    let total_signatures = 0;
    let total_releases = 0;

    while (true) {
      const signatures = await this.rpc.get_signatures_for_address({
        address: GUTENBERG_REGISTRY_PROGRAM_ID,
        limit: this.batch_size,
        ...(before ? { before } : {}),
        ...(input.until_signature ? { until: input.until_signature } : {}),
      });

      if (signatures.length === 0) {
        break;
      }

      total_signatures += signatures.length;

      const result = await this.process_signature_batch(
        signatures.map((sig) => sig.signature),
      );
      total_releases += result.releases_indexed;

      before = signatures[signatures.length - 1].signature;

      if (signatures.length < this.batch_size) {
        break;
      }
    }

    return {
      signatures_seen: total_signatures,
      releases_indexed: total_releases,
    };
  }

  private async process_signature_batch(
    signatures: string[],
  ): Promise<{ releases_indexed: number }> {
    let releases_indexed = 0;

    for (let i = 0; i < signatures.length; i += this.tx_concurrency) {
      const slice = signatures.slice(i, i + this.tx_concurrency);

      const results = await Promise.all(
        slice.map(async (signature) => {
          try {
            const tx = await this.rpc.get_transaction(signature);
            if (!tx?.meta?.logMessages || tx.meta.err) {
              return 0;
            }

            const result = await this.ingest.ingest_transaction({
              signature,
              slot: tx.slot,
              log_messages: tx.meta.logMessages,
            });

            return result.releases_indexed;
          } catch (error) {
            this.logger.warn(
              `Failed to process signature ${signature}: ${(error as Error).message}`,
            );
            return 0;
          }
        }),
      );

      releases_indexed += results.reduce((sum, n) => sum + n, 0);
    }

    return { releases_indexed };
  }

  private async write_cursor(input: {
    last_signature: string | null;
    last_slot: number | null;
  }): Promise<void> {
    const existing = await this.cursor_service.find({
      where: eq(cursorsTable.scope, RELEASES_CURSOR_SCOPE),
    });

    if (existing) {
      if (
        input.last_slot != null &&
        existing.last_slot != null &&
        existing.last_slot >= input.last_slot
      ) {
        return;
      }

      await this.cursor_service.update(existing.id, {
        last_signature: input.last_signature,
        last_slot: input.last_slot,
      });
      return;
    }

    await this.cursor_service.create({
      scope: RELEASES_CURSOR_SCOPE,
      last_signature: input.last_signature,
      last_slot: input.last_slot,
      backfill_completed_at: null,
    });
  }

  private async mark_backfill_completed(): Promise<void> {
    const existing = await this.cursor_service.find({
      where: eq(cursorsTable.scope, RELEASES_CURSOR_SCOPE),
    });

    const completed_at = new Date();

    if (existing) {
      await this.cursor_service.update(existing.id, {
        backfill_completed_at: completed_at,
      });
      return;
    }

    await this.cursor_service.create({
      scope: RELEASES_CURSOR_SCOPE,
      last_signature: null,
      last_slot: null,
      backfill_completed_at: completed_at,
    });
  }
}
