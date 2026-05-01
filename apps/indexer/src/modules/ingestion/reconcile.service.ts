import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { BackfillService } from './backfill.service';

@Injectable()
export class ReconcileService {
  private readonly logger = new Logger(ReconcileService.name);
  private running = false;

  constructor(private readonly backfill: BackfillService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcile_recent(): Promise<void> {
    if (this.running) {
      this.logger.warn('Previous reconcile still running; skipping');
      return;
    }

    this.running = true;

    try {
      const result = await this.backfill.backfill_recent({});
      if (result.releases_indexed > 0) {
        this.logger.log(
          `Reconcile picked up ${result.releases_indexed} release(s) over ${result.signatures_seen} sigs`,
        );
      }
    } catch (error) {
      this.logger.warn(`Reconcile failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
