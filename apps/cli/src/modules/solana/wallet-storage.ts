import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.config', 'gutenberg');
const KEYPAIR_FILE = join(CONFIG_DIR, 'wallet.json');

export const wallet_storage_path = KEYPAIR_FILE;

/**
 * Decode a base58-encoded Solana secret key into a {@link Keypair}.
 *
 * Throws a descriptive error on bad input — callers surface this to the user.
 */
export function decode_base58_secret_key(value: string): Keypair {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error('Secret key is empty.');
  }

  let decoded: Uint8Array;

  try {
    decoded = bs58.decode(trimmed);
  } catch (error) {
    throw new Error('Secret key is not valid base58.', { cause: error });
  }

  if (decoded.byteLength !== 64) {
    throw new Error(
      `Secret key must decode to 64 bytes (got ${decoded.byteLength}). Make sure you pasted the full Solana secret key, not just the public key.`,
    );
  }

  try {
    return Keypair.fromSecretKey(decoded);
  } catch (error) {
    throw new Error('Secret key did not produce a valid Solana keypair.', {
      cause: error,
    });
  }
}

/**
 * Read a stored keypair from `~/.config/gutenberg/wallet.json` if present.
 *
 * The file format is the Solana CLI keypair format: a JSON array of 64
 * unsigned bytes. Returns `undefined` when the file does not exist; throws
 * with a descriptive message on read or parse errors.
 */
export async function read_stored_keypair(): Promise<Keypair | undefined> {
  let raw: string;

  try {
    raw = await readFile(KEYPAIR_FILE, 'utf8');
  } catch (error) {
    if (is_file_not_found(error)) {
      return undefined;
    }

    throw new Error(
      `Failed to read ${KEYPAIR_FILE}: ${describe_error(error)}`,
      { cause: error },
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Stored wallet at ${KEYPAIR_FILE} is not valid JSON. Expected a 64-byte secret-key array (Solana CLI format).`,
      { cause: error },
    );
  }

  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error(
      `Stored wallet at ${KEYPAIR_FILE} must be a 64-byte secret-key array (Solana CLI format).`,
    );
  }

  for (const value of parsed) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error(
        `Stored wallet at ${KEYPAIR_FILE} contains a non-byte value. Expected integers in 0..255.`,
      );
    }
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
}

/**
 * Persist a keypair to `~/.config/gutenberg/wallet.json` in Solana CLI
 * format. Creates the config directory with restrictive permissions if
 * missing.
 */
export async function write_stored_keypair(keypair: Keypair): Promise<string> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });

  const bytes = Array.from(keypair.secretKey);

  await writeFile(KEYPAIR_FILE, JSON.stringify(bytes), { mode: 0o600 });

  return KEYPAIR_FILE;
}

function is_file_not_found(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

function describe_error(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
