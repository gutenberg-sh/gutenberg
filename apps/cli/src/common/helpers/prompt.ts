import { stderr, stdin } from 'node:process';
import { createInterface } from 'node:readline';

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
  const answer = (await prompt_line(`${question} ${suffix} `))
    .trim()
    .toLowerCase();

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
