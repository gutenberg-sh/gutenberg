import { stderr, stdin } from 'node:process';
import { createInterface } from 'node:readline';

export async function prompt_hidden(question: string): Promise<string> {
  if (!stdin.isTTY) {
    throw new Error(
      'Cannot prompt for a secret: stdin is not a TTY. Set GUTENBERG_SOLANA_PRIVATE_KEY or run interactively.',
    );
  }

  return new Promise<string>((resolve, reject) => {
    stderr.write(question);

    let buffer = '';

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', on_data);
    };

    const on_data = (chunk: Buffer) => {
      const text = chunk.toString('utf8');

      for (const ch of text) {
        const code = ch.charCodeAt(0);

        if (code === 13 || code === 10) {
          cleanup();
          stderr.write('\n');
          resolve(buffer);

          return;
        }

        if (code === 3) {
          cleanup();
          stderr.write('\n');
          reject(new Error('Input cancelled'));

          return;
        }

        if (code === 4 && buffer.length === 0) {
          cleanup();
          stderr.write('\n');
          reject(new Error('Input cancelled'));

          return;
        }

        if (code === 127 || code === 8) {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
          }

          continue;
        }

        if (code >= 32) {
          buffer += ch;
        }
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', on_data);
  });
}

export async function prompt_line(question: string): Promise<string> {
  if (!stdin.isTTY) {
    throw new Error('Cannot prompt: stdin is not a TTY.');
  }

  const rl = createInterface({ input: stdin, output: stderr, terminal: true });

  try {
    return await new Promise<string>((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  } finally {
    rl.close();
  }
}

export async function prompt_yes_no(
  question: string,
  options: { default_yes: boolean } = { default_yes: true },
): Promise<boolean> {
  const suffix = options.default_yes ? '[Y/n]' : '[y/N]';
  const answer = (await prompt_line(`${question} ${suffix} `)).trim().toLowerCase();

  if (answer === '') {
    return options.default_yes;
  }

  if (answer === 'y' || answer === 'yes') {
    return true;
  }

  if (answer === 'n' || answer === 'no') {
    return false;
  }

  return options.default_yes;
}

export function write_status(line: string): void {
  stderr.write(`${line}\n`);
}
