import { Injectable } from '@nestjs/common';
import {
  boolean,
  command,
  positional,
  run,
  string,
} from '@drizzle-team/brocli';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import { DoctorService } from '../doctor/doctor.service';
import { OpenService } from '../open/open.service';
import { PublishService } from '../publish/publish.service';
import { SolanaRegistryRepository } from '../registry/solana-registry.repository';

@Injectable()
export class CliService {
  constructor(
    private readonly doctorService: DoctorService,
    private readonly openService: OpenService,
    private readonly publishService: PublishService,
    private readonly solanaRegistryRepository: SolanaRegistryRepository,
  ) {}

  async run(): Promise<void> {
    const doctor = command({
      name: 'doctor',
      desc: 'Check S3-compatible storage and Solana publisher configuration',
      options: {},
      handler: async () => {
        const result = await this.doctorService.check();

        for (const check of result.checks) {
          const label = check.status === 'ok' ? 'OK' : 'ERROR';
          console.log(`[${label}] ${check.name}: ${check.message}`);
        }

        if (!result.ok) {
          process.exitCode = 1;
        }
      },
    });

    const publish = command({
      name: 'publish',
      desc: 'Publish a Markdown folder (tar bundle + manifest) to S3-compatible storage',
      options: {
        folder: positional('folder')
          .desc('Markdown folder to publish')
          .required(),
        name: string().desc('Site name').required(),
        version: string('version')
          .desc('Immutable site version')
          .required(),
      },
      handler: async (options) => {
        const result = await this.publishService.publish_site({
          folder: options.folder,
          name: options.name,
          version: options.version,
        });

        console.log(`Uploaded ${this.format_bytes(result.total_bytes)}`);
        console.log(`Files: ${result.file_count}`);
        console.log(`Manifest: ${result.manifest_uri}`);
        console.log(`Open with: gutenberg open ${result.manifest_uri}`);
      },
    });

    const open = command({
      name: 'open',
      desc: 'Open and verify a registered site name or s3:// manifest URI',
      options: {
        source: positional('source')
          .desc(
            'Site name or manifest URI (e.g. example or s3://bucket/manifests/...)',
          )
          .required(),
        version: string('version').desc('Specific site version'),
        print: boolean().desc(
          'Print the verified Markdown entry instead of opening an editor',
        ),
      },
      handler: async (options) => {
        const result = await this.openService.open_site({
          source: options.source,
          version: options.version,
        });

        console.log('Verified');
        console.log(`Name: ${result.name}`);
        console.log(`Version: ${result.version}`);
        console.log(`Entry: ${result.entry}`);
        console.log(`Files: ${result.file_count}`);
        console.log(`Manifest: ${result.manifest_uri}`);

        if (options.print) {
          console.log('');
          console.log(result.content);
          return;
        }

        const path = await this.write_entry_file(result);
        await this.open_editor(path);
        console.log(`Opened: ${path}`);
      },
    });

    const airdrop = command({
      name: 'airdrop',
      desc: 'Airdrop localnet SOL to the publisher wallet',
      options: {
        amount: string('amount').desc('SOL amount to airdrop'),
      },
      handler: async (options) => {
        const amount = Number(options.amount ?? '2');

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Airdrop amount must be a positive number');
        }

        const result = await this.solanaRegistryRepository.airdrop_sol(amount);

        console.log(
          `Airdropped ${result.sol} SOL to ${result.public_key.toBase58()}`,
        );
      },
    });

    await run([doctor, publish, open, airdrop], {
      name: 'gutenberg',
      description: 'Verifiable publishing for the Solana ecosystem',
      version: '0.0.0',
    });
  }

  private format_bytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private async write_entry_file(result: {
    name: string;
    version: string;
    entry: string;
    content: string;
  }): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'gutenberg-open-'));
    const basename =
      result.entry.split('/').filter(Boolean).at(-1) ?? 'index.md';
    const path = join(dir, `${result.name}-${result.version}-${basename}`);

    await writeFile(path, result.content);

    return path;
  }

  private async open_editor(path: string): Promise<void> {
    const editor = process.env.VISUAL ?? process.env.EDITOR;

    if (editor) {
      await this.spawn_editor(editor, [path], true);
      return;
    }

    if (process.platform === 'darwin') {
      await this.spawn_editor('open', ['-t', path], false);
      return;
    }

    if (process.platform === 'win32') {
      await this.spawn_editor('notepad', [path], false);
      return;
    }

    await this.spawn_editor('xdg-open', [path], false);
  }

  private async spawn_editor(
    command: string,
    args: string[],
    shell: boolean,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        shell,
        stdio: 'inherit',
      });

      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Editor exited with status ${code}`));
      });
    });
  }
}
