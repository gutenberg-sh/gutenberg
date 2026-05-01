import { command, positional, string } from '@drizzle-team/brocli';
import { Inject, Injectable } from '@nestjs/common';

import { GATEWAY_URL } from '../../common/config/config.tokens';
import { open_url_in_browser } from '../../common/helpers/open-browser';
import {
  assert_valid_name,
  parse_name_at_version,
} from '../../common/helpers/parse-spec';
import { RegistryService } from '../registry/registry.service';

@Injectable()
export class OpenCommand {
  constructor(
    @Inject(GATEWAY_URL) private readonly gateway_url: string,
    private readonly registry_service: RegistryService,
  ) {}

  build() {
    return command({
      name: 'open',
      desc: 'Open a release in the Gutenberg gateway (browser-side verification)',
      options: {
        pkg: positional('pkg')
          .desc(
            'name@version for a specific release, or name alone to open the latest version',
          )
          .required(),
        gateway: string('gateway').desc(
          'Override the gateway URL (defaults to GUTENBERG_GATEWAY_URL env)',
        ),
      },
      handler: async (options) => {
        const { name, version } = await this.resolve_name_and_version(
          options.pkg,
        );
        const gateway_base = (options.gateway ?? this.gateway_url).replace(
          /\/$/,
          '',
        );
        const url = `${gateway_base}/r/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;

        console.log(url);

        open_url_in_browser(url);
      },
    });
  }

  private async resolve_name_and_version(
    pkg: string,
  ): Promise<{ name: string; version: string }> {
    const trimmed = pkg.trim();

    if (trimmed.includes('@')) {
      return parse_name_at_version(trimmed, 'open');
    }

    assert_valid_name(trimmed, 'open');

    const release = await this.registry_service.find_release({ name: trimmed });

    if (!release) {
      throw new Error(`open: no releases found for "${trimmed}"`);
    }

    return { name: release.name, version: release.version };
  }
}
