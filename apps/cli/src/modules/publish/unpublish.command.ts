import { command, positional } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import {
  assert_valid_site_name,
  parse_name_at_version,
} from '../../common/helpers/parse-spec';

import { UnpublishService } from './unpublish.service';

@Injectable()
export class UnpublishCommand {
  constructor(private readonly unpublish_service: UnpublishService) {}

  build() {
    return command({
      name: 'unpublish',
      desc: 'Remove release(s) you published from the Solana registry and reclaim account rent',
      options: {
        pkg: positional('pkg')
          .desc(
            'name@version for one release, or site name alone to unpublish every version',
          )
          .required(),
      },
      handler: async (options) => {
        const trimmed = options.pkg.trim();

        if (trimmed.includes('@')) {
          const { name, version } = parse_name_at_version(trimmed, 'unpublish');

          await this.unpublish_service.unpublish_site({ name, version });

          console.log(`Unpublished ${name}@${version}`);
          return;
        }

        assert_valid_site_name(trimmed, 'unpublish');

        await this.unpublish_service.unpublish_all_for_name(trimmed);

        console.log(`Unpublished all versions of ${trimmed}`);
      },
    });
  }
}
