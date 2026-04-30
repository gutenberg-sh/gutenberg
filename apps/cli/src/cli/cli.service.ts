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
      desc: 'Check Irys/Arweave storage and Solana publisher configuration',
      options: {},
      handler: async () => {
        const result = await this.doctorService.check();

        for (const check of result.checks) {
          const label =
            check.status === 'ok'
              ? 'OK'
              : check.status === 'warn'
                ? 'WARN'
                : 'ERROR';
          console.log(`[${label}] ${check.name}: ${check.message}`);
        }

        if (!result.ok) {
          process.exitCode = 1;
        }
      },
    });

    const publish = command({
      name: 'publish',
      desc: 'Publish a Markdown folder (tar + manifest) via Irys and register on Solana',
      options: {
        pkg: positional('pkg')
          .desc('Site name and version, npm-style: name@version')
          .required(),
        folder: positional('folder')
          .desc('Markdown folder to publish')
          .required(),
      },
      handler: async (options) => {
        const { name, version } = parse_name_at_version(options.pkg, 'publish');

        const result = await this.publishService.publish_site({
          folder: options.folder,
          name,
          version,
        });

        console.log(`Uploaded ${this.format_bytes(result.total_bytes)}`);
        console.log(`Files: ${result.file_count}`);
        console.log(`Manifest: ${result.manifest_uri}`);
        console.log(`Open with: gutenberg open ${name}@${version}`);
      },
    });

    const open = command({
      name: 'open',
      desc: 'Open and verify a registered site name or manifest https URL',
      options: {
        source: positional('source')
          .desc(
            'Site name, name@version, or manifest https URL',
          )
          .required(),
        release_version: string('release-version').desc(
          'Site version (only when source is a plain name without @)',
        ),
        print: boolean().desc(
          'Print the verified Markdown entry instead of opening an editor',
        ),
      },
      handler: async (options) => {
        const parsed = parse_open_source(options.source);
        const version_from_flag = options.release_version;

        if (
          parsed.version !== undefined &&
          version_from_flag !== undefined &&
          parsed.version !== version_from_flag
        ) {
          throw new Error(
            'Version mismatch: source uses name@version but --release-version differs; use only one',
          );
        }

        const version = version_from_flag ?? parsed.version;

        const result = await this.openService.open_site({
          source: parsed.source,
          version,
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

const site_name_pattern = /^[a-z0-9][a-z0-9._-]*$/;

/** Plain name, or name@version for npm-style spec (not https URLs). */
function parse_open_source(raw: string): { source: string; version?: string } {
  const trimmed = raw.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { source: trimmed };
  }

  const at = trimmed.indexOf('@');

  if (at <= 0 || at === trimmed.length - 1) {
    return { source: trimmed };
  }

  const name = trimmed.slice(0, at);
  const version = trimmed.slice(at + 1);

  if (!version || !site_name_pattern.test(name)) {
    return { source: trimmed };
  }

  return { source: name, version };
}

function parse_name_at_version(
  spec: string,
  label: string,
): { name: string; version: string } {
  const trimmed = spec.trim();
  const at = trimmed.indexOf('@');

  if (at <= 0 || at === trimmed.length - 1) {
    throw new Error(
      `${label}: expected name@version (e.g. my-site@1.0.0), got "${trimmed}"`,
    );
  }

  const name = trimmed.slice(0, at);
  const version = trimmed.slice(at + 1);

  if (!site_name_pattern.test(name)) {
    throw new Error(
      `${label}: site name must match release naming rules, got "${name}"`,
    );
  }

  if (!version) {
    throw new Error(`${label}: version must not be empty`);
  }

  return { name, version };
}
