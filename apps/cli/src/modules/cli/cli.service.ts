import { type BroCliEvent, run } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { ui } from '../../common/helpers/ui';
import { DoctorCommand } from '../doctor/doctor.command';
import { OpenCommand } from '../open/open.command';
import { PublishCommand } from '../publish/publish.command';

@Injectable()
export class CliService {
  constructor(
    private readonly doctor_command: DoctorCommand,
    private readonly publish_command: PublishCommand,
    private readonly open_command: OpenCommand,
  ) {}

  async run(): Promise<void> {
    ui.header('publish freely. read what\u2019s real.');

    await run(
      [
        this.doctor_command.build(),
        this.publish_command.build(),
        this.open_command.build(),
      ],
      {
        name: 'gutenberg',
        description: 'Verifiable publishing for the Solana ecosystem',
        theme: (event) => Promise.resolve(handle_brocli_event(event)),
      },
    );
  }
}

function handle_brocli_event(event: BroCliEvent): boolean {
  if (event.type !== 'error') return false;

  switch (event.violation) {
    case 'unknown_command_error':
      ui.error(`Unknown command: ${ui.fmt.bold(event.offender)}`);
      ui.hint(`Run ${ui.fmt.id('gutenberg --help')} to see what's available.`);
      process.exitCode = 1;
      return true;

    case 'unknown_subcommand_error':
      ui.error(`Unknown subcommand: ${ui.fmt.bold(event.offender)}`);
      process.exitCode = 1;
      return true;

    case 'missing_args_error': {
      const list = event.missing.map((group) => group.join(', ')).join(' · ');
      ui.error(`Missing required argument${event.missing.length === 1 ? '' : 's'}: ${ui.fmt.bold(list)}`);
      ui.hint(
        `Run ${ui.fmt.id(`gutenberg ${name_with_parents(event.command)} --help`)} for usage.`,
      );
      process.exitCode = 1;
      return true;
    }

    case 'unrecognized_args_error':
      ui.error(`Unrecognized arguments: ${ui.fmt.bold(event.unrecognized.join(', '))}`);
      process.exitCode = 1;
      return true;

    case 'unknown_error': {
      const message =
        event.error instanceof Error
          ? event.error.message
          : String(event.error);
      ui.error(message);

      if (process.env.GUTENBERG_DEBUG && event.error instanceof Error && event.error.stack) {
        ui.writeln(`\n${event.error.stack}`);
      }
      process.exitCode = 1;
      return true;
    }

    default: {
      const offender = event.offender?.dataPart ?? event.offender?.namePart ?? '';
      ui.error(
        `Invalid value for ${ui.fmt.bold(event.option.name)}${offender ? `: ${offender}` : ''} (${event.violation})`,
      );
      process.exitCode = 1;
      return true;
    }
  }
}

function name_with_parents(
  command: { name: string; parent?: { name: string } } | 'globals',
): string {
  if (command === 'globals') return '';
  const parts = [command.name];
  let cursor = command.parent;
  while (cursor) {
    parts.unshift(cursor.name);
    cursor = (cursor as { parent?: { name: string } }).parent;
  }
  return parts.join(' ');
}
