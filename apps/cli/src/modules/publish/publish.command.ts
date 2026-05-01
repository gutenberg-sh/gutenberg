import { command, positional, string } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { format_bytes } from '../../common/helpers/format-bytes';
import { parse_name_at_version } from '../../common/helpers/parse-spec';
import { write_status } from '../../common/helpers/prompt';

import { PublishCancelledError, PublishService } from './publish.service';
import type { PublishOptions, PublishProgressEvent } from './publish.types';

@Injectable()
export class PublishCommand {
  constructor(private readonly publish_service: PublishService) {}

  build() {
    return command({
      name: 'publish',
      desc: 'Publish a folder of writing via the browser wallet (Phantom & friends)',
      options: {
        pkg: positional('pkg')
          .desc('Release name and version, npm-style: name@version')
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
          const result = await this.publish_service.publish_release(
            publish_options,
            {
              on_progress: report_progress,
            },
          );

          console.log('');
          console.log(
            `Uploaded ${format_bytes(result.total_bytes)} across ${result.file_count} file(s)`,
          );
          console.log(`Publisher: ${result.publisher}`);
          console.log(`Manifest:  ${result.manifest_uri}`);
          console.log(`Release:   ${result.release_address}`);
          console.log(`Signature: ${result.signature}`);
        } catch (error) {
          if (error instanceof PublishCancelledError) {
            write_status(`Publish cancelled. ${error.message}`);
            process.exitCode = 1;
            return;
          }

          throw error;
        }
      },
    });
  }
}

function report_progress(event: PublishProgressEvent): void {
  write_status(`[${event.kind}] ${event.message}`);
}
