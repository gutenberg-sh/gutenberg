#!/usr/bin/env node
/**
 * Runs `nest start --watch`, forwarding argv after `--` so Gutenberg subcommands work:
 *   pnpm run start:dev open gutenberg-demo
 * → nest start --watch -- open gutenberg-demo
 *
 * Invokes nest.js via node so `nest` does not need to be on PATH when pnpm runs scripts.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cli_root = path.join(__dirname, '..');
const nest_js = path.join(
  cli_root,
  'node_modules',
  '@nestjs/cli',
  'bin',
  'nest.js',
);
const extra = process.argv.slice(2);
const nest_args = ['start', '--watch'];
if (extra.length > 0) {
  nest_args.push('--', ...extra);
}

const result = spawnSync(process.execPath, [nest_js, ...nest_args], {
  cwd: cli_root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
