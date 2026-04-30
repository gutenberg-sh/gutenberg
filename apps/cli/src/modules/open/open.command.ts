import { boolean, command, number, positional } from '@drizzle-team/brocli';
import { Injectable } from '@nestjs/common';

import { open_url_in_browser } from '../../common/helpers/open-browser';
import { parse_open_source } from '../../common/helpers/parse-spec';
import { wait_for_shutdown_signal } from '../../common/helpers/wait-for-shutdown';
import { LocalSiteGatewayService } from '../gateway/local-site-gateway.service';

import { OpenService } from './open.service';

const DEFAULT_PORT = 8787;

@Injectable()
export class OpenCommand {
  constructor(
    private readonly open_service: OpenService,
    private readonly local_site_gateway_service: LocalSiteGatewayService,
  ) {}

  build() {
    return command({
      name: 'open',
      desc: 'Verify a site and serve sanitized Markdown as HTML locally (default)',
      options: {
        source: positional('source')
          .desc('Site name, name@version, or manifest https URL')
          .required(),
        print: boolean('print').desc(
          'Print the verified entry Markdown to stdout and exit (no local server)',
        ),
        port: number('port')
          .desc(`HTTP port for the local gateway (default ${DEFAULT_PORT})`)
          .default(DEFAULT_PORT)
          .min(1)
          .max(65535),
        no_browser: boolean('no-browser')
          .desc('Do not open the system browser')
          .alias('-n'),
      },
      handler: async (options) => {
        const parsed = parse_open_source(options.source);

        const result = await this.open_service.open_site({
          source: parsed.source,
          version: parsed.version,
        });

        console.log('Verified');
        console.log(`Name: ${result.name}`);
        console.log(`Version: ${result.version}`);
        console.log(`Entry: ${result.entry}`);
        console.log(`Files: ${result.file_count}`);
        console.log(`Manifest: ${result.manifest_uri}`);

        if (result.release_pda) {
          console.log(`Release PDA: ${result.release_pda}`);
        }

        if (options.print) {
          console.log('');
          console.log(result.content);
          return;
        }

        const { url, close } = await this.local_site_gateway_service.listen({
          host: '127.0.0.1',
          port: options.port ?? DEFAULT_PORT,
          name: result.name,
          version: result.version,
          manifest: result.manifest,
          files: result.files,
        });

        console.log('');
        console.log(`Local gateway: ${url}`);
        console.log('Press Ctrl+C to stop');

        if (!options.no_browser) {
          open_url_in_browser(url);
        }

        await wait_for_shutdown_signal();
        await close();
      },
    });
  }
}
