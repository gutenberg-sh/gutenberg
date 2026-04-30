import { command, positional } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { format_bytes } from '../../common/helpers/format-bytes';
import { parse_name_at_version } from '../../common/helpers/parse-spec';

import { PublishService } from './publish.service';

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

        const result = await this.publish_service.publish_site({
          folder: options.folder,
          name,
          version,
        });

        console.log(`Uploaded ${format_bytes(result.total_bytes)}`);
        console.log(`Files: ${result.file_count}`);
        console.log(`Manifest: ${result.manifest_uri}`);
        console.log(`Read with: gutenberg open ${name}@${version}`);
      },
    });
  }
}
