import { command, positional } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { format_bytes } from '../../common/helpers/format-bytes';
import { parse_name_at_version } from '../../common/helpers/parse-spec';
import { prompt_yes_no, write_status } from '../../common/helpers/prompt';

import { PublishCancelledError, PublishService } from './publish.service';
import type { PublishCostPreview } from './publish.types';

@Injectable()
export class PublishCommand {
  constructor(private readonly publish_service: PublishService) {}

  build() {
    return command({
      name: 'publish',
      desc: 'Publish a folder of writing (tar + manifest) via Irys and register on Solana',
      options: {
        pkg: positional('pkg')
          .desc('Site name and version, npm-style: name@version')
          .required(),
        folder: positional('folder')
          .desc('Folder of writing to publish')
          .required(),
      },
      handler: async (options) => {
        const { name, version } = parse_name_at_version(options.pkg, 'publish');

        try {
          const result = await this.publish_service.publish_site(
            {
              folder: options.folder,
              name,
              version,
            },
            { confirm_cost: confirm_publish_cost },
          );

          console.log(`Uploaded ${format_bytes(result.total_bytes)}`);
          console.log(`Files: ${result.file_count}`);
          console.log(`Manifest: ${result.manifest_uri}`);
          console.log(`Read with: gutenberg open ${name}@${version}`);
        } catch (error) {
          if (error instanceof PublishCancelledError) {
            write_status('Publish cancelled.');
            process.exitCode = 1;
            return;
          }

          throw error;
        }
      },
    });
  }
}

async function confirm_publish_cost(
  preview: PublishCostPreview,
): Promise<boolean> {
  const { bundle_bytes, manifest_bytes, total_bytes, file_count, cost } =
    preview;

  write_status(
    `About to upload ${file_count} file(s): bundle ${format_bytes(bundle_bytes)} + manifest ${format_bytes(manifest_bytes)} = ${format_bytes(total_bytes)}.`,
  );
  write_status(
    `Estimated Irys cost: ${cost.display_amount} ${cost.ticker} (${cost.atomic_units} atomic units).`,
  );

  return prompt_yes_no('Continue with publish?', { default_yes: true });
}
