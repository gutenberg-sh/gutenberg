import { run } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { DoctorCommand } from '../doctor/doctor.command';
import { OpenCommand } from '../open/open.command';
import { PublishCommand } from '../publish/publish.command';
import { UnpublishCommand } from '../publish/unpublish.command';

@Injectable()
export class CliService {
  constructor(
    private readonly doctor_command: DoctorCommand,
    private readonly publish_command: PublishCommand,
    private readonly unpublish_command: UnpublishCommand,
    private readonly open_command: OpenCommand,
  ) {}

  async run(): Promise<void> {
    await run(
      [
        this.doctor_command.build(),
        this.publish_command.build(),
        this.unpublish_command.build(),
        this.open_command.build(),
      ],
      {
        name: 'gutenberg',
        description: 'Verifiable publishing for the Solana ecosystem',
      },
    );
  }
}
