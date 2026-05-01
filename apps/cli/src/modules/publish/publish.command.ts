import { command, positional, string } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { format_bytes } from '../../common/helpers/format-bytes';
import { parse_name_at_version } from '../../common/helpers/parse-spec';
import { ui } from '../../common/helpers/ui';

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

        ui.info(
          `Publishing ${ui.fmt.bold(name)}${ui.fmt.dim('@')}${ui.fmt.bold(version)} from ${ui.fmt.dim(options.folder)}`,
        );
        ui.divider();

        const started_at = Date.now();

        try {
          const result = await this.publish_service.publish_release(
            publish_options,
            {
              on_browser_opened: (url) => {
                ui.info(`Browser opened to sign release`);
                ui.hint(url);
              },
              on_progress: report_progress,
            },
          );

          ui.divider();
          ui.success(
            `Uploaded ${ui.fmt.bold(format_bytes(result.total_bytes))} across ${ui.fmt.bold(`${result.file_count} file${result.file_count === 1 ? '' : 's'}`)}`,
          );
          ui.kv([
            { k: 'Publisher', v: ui.fmt.id(result.publisher) },
            { k: 'Manifest', v: ui.fmt.id(result.manifest_uri) },
            { k: 'Release', v: ui.fmt.id(result.release_address) },
            { k: 'Signature', v: ui.fmt.id(result.signature) },
          ]);

          const elapsed = Date.now() - started_at;
          ui.done(
            `Published ${name}@${version} ${ui.fmt.dim(`(${ui.fmt.duration(elapsed)})`)}`,
          );
        } catch (error) {
          if (error instanceof PublishCancelledError) {
            ui.divider();
            ui.failed(`Publish cancelled — ${error.message}`);
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
  const message = humanise_progress(event);

  if (message === undefined) {
    ui.step(event.message);
    return;
  }

  ui.success(message);
}

function humanise_progress(event: PublishProgressEvent): string | undefined {
  switch (event.kind) {
    case 'wallet_connected':
      return `Wallet connected ${ui.fmt.dim(`(${event.message})`)}`;
    case 'upload_started':
      return `Uploading bundle to Irys`;
    case 'upload_complete':
      return `Bundle uploaded ${ui.fmt.dim(`(${event.message})`)}`;
    case 'tx_sent':
      return `Submitted to Solana ${ui.fmt.dim(`(${event.message})`)}`;
    default:
      return undefined;
  }
}
