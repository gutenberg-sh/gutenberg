import { command } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

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
        const result = await this.doctor_service.check();

        for (const check of result.checks) {
          const label =
            check.status === 'ok'
              ? 'OK'
              : check.status === 'warn'
                ? 'WARN'
                : 'ERROR';
          console.log(`[${label}] ${check.name}: ${check.message}`);
        }

        if (!result.ok) {
          process.exitCode = 1;
        }
      },
    });
  }
}
