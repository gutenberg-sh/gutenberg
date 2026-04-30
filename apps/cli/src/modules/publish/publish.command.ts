import { command, positional, string } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { format_bytes } from '../../common/helpers/format-bytes';
import { parse_name_at_version } from '../../common/helpers/parse-spec';
import { prompt_yes_no, write_status } from '../../common/helpers/prompt';

import { PublishCancelledError, PublishService } from './publish.service';
import type {
  FileUploadEvent,
  PublishCostPreview,
  PublishOptions,
} from './publish.types';

@Injectable()
export class PublishCommand {
  constructor(private readonly publish_service: PublishService) {}

  build() {
    return command({
      name: 'publish',
      desc: 'Publish a folder of writing as content-addressed files via Irys and register on Solana',
      options: {
        pkg: positional('pkg')
          .desc('Site name and version, npm-style: name@version')
          .required(),
        folder: positional('folder')
          .desc('Folder of writing to publish')
          .required(),
        license: string('license').desc(
          'Optional SPDX license identifier (e.g. MIT, CC-BY-4.0)',
        ),
        language: string('language').desc(
          'Optional BCP-47 language tag (e.g. en, en-US, de)',
        ),
        tags: string('tags').desc(
          'Optional comma-separated tags (lowercase, [a-z0-9._-])',
        ),
        prevVersion: string('prev-version').desc(
          'Optional predecessor version for this release',
        ),
      },
      handler: async (options) => {
        const { name, version } = parse_name_at_version(options.pkg, 'publish');

        const publish_options: PublishOptions = {
          folder: options.folder,
          name,
          version,
          ...(options.license ? { license: options.license } : {}),
          ...(options.language ? { language: options.language } : {}),
          ...(options.tags
            ? {
                tags: options.tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0),
              }
            : {}),
          ...(options.prevVersion ? { prev_version: options.prevVersion } : {}),
        };

        try {
          const result = await this.publish_service.publish_site(
            publish_options,
            {
              confirm_cost: confirm_publish_cost,
              on_file_uploaded: report_file_uploaded,
            },
          );

          console.log(
            `Uploaded ${format_bytes(result.total_bytes)} across ${result.file_count} file(s)`,
          );
          console.log(`Manifest: ${result.manifest_uri}`);
          console.log(`Release PDA: ${result.release_pda}`);
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
  const { files_bytes, manifest_bytes, total_bytes, file_count, cost } =
    preview;

  write_status(
    `About to upload ${file_count} file(s) individually: files ${format_bytes(files_bytes)} + manifest ${format_bytes(manifest_bytes)} = ${format_bytes(total_bytes)}.`,
  );
  write_status(
    `Estimated Irys cost: ${cost.display_amount} ${cost.ticker} (${cost.atomic_units} atomic units).`,
  );

  return prompt_yes_no('Continue with publish?', { default_yes: true });
}

function report_file_uploaded(event: FileUploadEvent): void {
  const idx = String(event.index + 1).padStart(
    String(event.total).length,
    ' ',
  );
  write_status(
    `[${idx}/${event.total}] ${event.site_path} (${format_bytes(event.size_bytes)})`,
  );
}
