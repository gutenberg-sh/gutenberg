import { command } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { ui } from '../../common/helpers/ui';

import { DoctorService } from './doctor.service';

@Injectable()
export class DoctorCommand {
  constructor(private readonly doctor_service: DoctorService) {}

  build() {
    return command({
      name: 'doctor',
      desc: 'Check Irys/Arweave storage and Solana publisher configuration',
      options: {},
      handler: async () => {
        ui.info('Running environment checks');
        ui.divider();

        const started_at = Date.now();
        const result = await this.doctor_service.check();

        for (const check of result.checks) {
          if (check.status === 'ok') {
            ui.success(check.message);
          } else if (check.status === 'warn') {
            ui.warn(check.message);
          } else {
            ui.error(check.message);
          }
        }

        const totals = summarise(result.checks);
        const duration = Date.now() - started_at;

        ui.divider();
        ui.kv([
          { k: 'Healthy', v: ui.fmt.bold(String(totals.ok)) },
          { k: 'Warnings', v: String(totals.warn) },
          { k: 'Errors', v: String(totals.error) },
          { k: 'Took', v: ui.fmt.duration(duration) },
        ]);

        if (result.ok) {
          ui.done(
            totals.warn > 0
              ? `Ready to publish (with ${totals.warn} warning${totals.warn === 1 ? '' : 's'})`
              : 'Ready to publish',
          );
        } else {
          ui.failed(
            `${totals.error} check${totals.error === 1 ? '' : 's'} failed`,
          );
          process.exitCode = 1;
        }
      },
    });
  }
}

function summarise(
  checks: ReadonlyArray<{ status: 'ok' | 'warn' | 'error' }>,
): { ok: number; warn: number; error: number } {
  return checks.reduce(
    (acc, check) => {
      acc[check.status] += 1;
      return acc;
    },
    { ok: 0, warn: 0, error: 0 },
  );
}
