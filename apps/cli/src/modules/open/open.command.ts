import { boolean, command, positional, string } from '@drizzle-team/brocli';
import { Inject, Injectable } from '@nestjs/common';

import { GATEWAY_URL } from '../../common/config/config.tokens';
import { open_url_in_browser } from '../../common/helpers/open-browser';
import { parse_open_source } from '../../common/helpers/parse-spec';

@Injectable()
export class OpenCommand {
  constructor(@Inject(GATEWAY_URL) private readonly gateway_url: string) {}

  build() {
    return command({
      name: 'open',
      desc: 'Open a release in the Gutenberg gateway (browser-side verification)',
      options: {
        source: positional('source')
          .desc('Site name, name@version, or manifest https URL')
          .required(),
        gateway: string('gateway')
          .desc(
            'Override the gateway URL (defaults to GUTENBERG_GATEWAY_URL env)',
          ),
        publisher: string('publisher')
          .desc(
            "Publisher's Solana public key (recommended on public RPCs that disable getProgramAccounts)",
          )
          .alias('-p'),
        no_browser: boolean('no-browser')
          .desc('Print the gateway URL only, do not open the browser')
          .alias('-n'),
      },
      handler: (options) => {
        const gateway_base = (options.gateway ?? this.gateway_url).replace(
          /\/$/,
          '',
        );
        const url = build_gateway_url({
          gateway: gateway_base,
          source: options.source,
          publisher: options.publisher,
        });

        console.log(url);

        if (!options.no_browser) {
          open_url_in_browser(url);
        }
      },
    });
  }
}

function build_gateway_url(input: {
  gateway: string;
  source: string;
  publisher?: string;
}): string {
  const trimmed = input.source.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const params = new URLSearchParams({ uri: trimmed });

    return `${input.gateway}/m?${params.toString()}`;
  }

  const parsed = parse_open_source(trimmed);
  const path = parsed.version
    ? `/r/${encodeURIComponent(parsed.source)}/${encodeURIComponent(parsed.version)}`
    : `/r/${encodeURIComponent(parsed.source)}`;
  const query = input.publisher
    ? `?${new URLSearchParams({ p: input.publisher }).toString()}`
    : '';

  return `${input.gateway}${path}${query}`;
}
