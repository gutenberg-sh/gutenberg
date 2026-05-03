import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stderr } from 'node:process';

const SUPPORTS_TTY = stderr.isTTY === true;

const SUPPORTS_COLOR = (() => {
  if (process.env.NO_COLOR != null && process.env.NO_COLOR !== '') return false;
  if (process.env.FORCE_COLOR != null && process.env.FORCE_COLOR !== '0') return true;
  return SUPPORTS_TTY;
})();

function paint(open: number, close: number) {
  return (value: string): string =>
    SUPPORTS_COLOR ? `\x1b[${open}m${value}\x1b[${close}m` : value;
}

const c = {
  bold: paint(1, 22),
  dim: paint(2, 22),
  italic: paint(3, 23),
  underline: paint(4, 24),
  red: paint(31, 39),
  green: paint(32, 39),
  yellow: paint(33, 39),
  blue: paint(34, 39),
  cyan: paint(36, 39),
  gray: paint(90, 39),
};

const SYMBOLS = {
  info: '›',
  ok: '✓',
  warn: '⚠',
  err: '✗',
  bullet: '·',
  arrow: '→',
} as const;

function write(line: string): void {
  stderr.write(line);
}

function writeln(line = ''): void {
  stderr.write(`${line}\n`);
}

function read_cli_version(): string {
  let dir = __dirname;

  for (let i = 0; i < 6; i += 1) {
    try {
      const pkg = JSON.parse(
        readFileSync(join(dir, 'package.json'), 'utf8'),
      ) as { name?: string; version?: string };

      if (pkg.name === '@gutenberg/cli' && typeof pkg.version === 'string') {
        return pkg.version;
      }
    } catch {
      // keep walking
    }

    const parent = dirname(dir);

    if (parent === dir) break;

    dir = parent;
  }

  return '0.0.0';
}

let cached_version: string | undefined;

function cli_version(): string {
  if (cached_version === undefined) {
    cached_version = read_cli_version();
  }

  return cached_version;
}

export const ui = {
  symbols: SYMBOLS,

  /** Branded header. Printed once at the start of any command. */
  header(subtitle?: string): void {
    const brand = `${c.bold('Gutenberg')} ${c.dim(cli_version())}`;
    writeln('');
    writeln(`  ${brand}`);

    if (subtitle) {
      writeln(`  ${c.dim(subtitle)}`);
    }

    writeln('');
  },

  /** Section divider — a single blank line. */
  divider(): void {
    writeln('');
  },

  /** Cyan info chevron — for "we're doing X" lines that don't have a final state. */
  info(message: string): void {
    writeln(`  ${c.cyan(SYMBOLS.info)} ${message}`);
  },

  /** Dimmed step — for sequential progress that will be superseded by a final state. */
  step(message: string): void {
    writeln(`  ${c.dim(SYMBOLS.info)} ${c.dim(message)}`);
  },

  /** Green check — for completed work. */
  success(message: string): void {
    writeln(`  ${c.green(SYMBOLS.ok)} ${message}`);
  },

  /** Yellow warning. */
  warn(message: string): void {
    writeln(`  ${c.yellow(SYMBOLS.warn)} ${message}`);
  },

  /** Red error — for failures. */
  error(message: string): void {
    writeln(`  ${c.red(SYMBOLS.err)} ${message}`);
  },

  /** Cyan note — for paths/URLs the user should look at. */
  hint(message: string): void {
    writeln(`  ${c.dim(SYMBOLS.bullet)} ${c.dim(message)}`);
  },

  /** Aligned key/value block. Used for publish summaries and doctor totals. */
  kv(rows: ReadonlyArray<{ k: string; v: string }>): void {
    if (rows.length === 0) return;

    const max = Math.max(...rows.map((r) => r.k.length));

    for (const { k, v } of rows) {
      writeln(`  ${c.dim(k.padEnd(max))}   ${v}`);
    }
  },

  /** Final boxed-feel "Ready in 8.4s" footer. */
  done(message: string): void {
    writeln('');
    writeln(`  ${c.bold(c.green(SYMBOLS.ok))} ${c.bold(message)}`);
    writeln('');
  },

  /** Final failure footer. */
  failed(message: string): void {
    writeln('');
    writeln(`  ${c.bold(c.red(SYMBOLS.err))} ${c.bold(message)}`);
    writeln('');
  },

  /** Inline format helpers — return styled strings for embedding in messages. */
  fmt: {
    url(value: string): string {
      return c.cyan(c.underline(value));
    },
    id(value: string): string {
      return c.cyan(value);
    },
    bold(value: string): string {
      return c.bold(value);
    },
    dim(value: string): string {
      return c.dim(value);
    },
    label(value: string): string {
      return c.bold(value);
    },
    duration(ms: number): string {
      if (ms < 1_000) return c.dim(`${ms}ms`);
      const seconds = ms / 1_000;
      return c.dim(`${seconds.toFixed(seconds < 10 ? 2 : 1)}s`);
    },
  },

  /** Spinner for indeterminate work. Falls back to a single line on non-TTY. */
  spinner(initial: string): {
    update(message: string): void;
    succeed(message: string): void;
    fail(message: string): void;
    stop(): void;
  } {
    if (!SUPPORTS_TTY) {
      writeln(`  ${c.cyan(SYMBOLS.info)} ${initial}`);
      return {
        update(_message: string) {
          // no-op
        },
        succeed(message: string) {
          writeln(`  ${c.green(SYMBOLS.ok)} ${message}`);
        },
        fail(message: string) {
          writeln(`  ${c.red(SYMBOLS.err)} ${message}`);
        },
        stop() {
          // no-op
        },
      };
    }

    const frames = ['◐', '◓', '◑', '◒'];
    let frame = 0;
    let message = initial;
    let active = true;

    function clear(): void {
      stderr.write('\r\x1b[2K');
    }

    function paint_frame(): void {
      clear();
      write(`  ${c.cyan(frames[frame] ?? '◐')} ${c.dim(message)}`);
    }

    paint_frame();

    const interval = setInterval(() => {
      if (!active) return;
      frame = (frame + 1) % frames.length;
      paint_frame();
    }, 100);

    return {
      update(next: string) {
        message = next;
        if (active) paint_frame();
      },
      succeed(next: string) {
        if (!active) return;
        active = false;
        clearInterval(interval);
        clear();
        writeln(`  ${c.green(SYMBOLS.ok)} ${next}`);
      },
      fail(next: string) {
        if (!active) return;
        active = false;
        clearInterval(interval);
        clear();
        writeln(`  ${c.red(SYMBOLS.err)} ${next}`);
      },
      stop() {
        if (!active) return;
        active = false;
        clearInterval(interval);
        clear();
      },
    };
  },

  /** Style a question prompt prefix. */
  prompt(message: string): string {
    return `  ${c.cyan('?')} ${message} `;
  },

  /** Raw write (for places that need finer control, e.g. inline output). */
  write,
  writeln,
};

export type Ui = typeof ui;
