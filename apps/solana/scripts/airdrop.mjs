#!/usr/bin/env node

/**
 * Local-validator SOL airdrop for the publisher wallet in the repo-root `.env`.
 * Usage: node scripts/airdrop.mjs [amount_sol]
 * Default amount is 2.
 */

import bs58 from 'bs58';
import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo_root = resolve(__dirname, '..', '..', '..');
dotenv.config({ path: resolve(repo_root, '.env'), quiet: true });

const rpc_url = process.env.GUTENBERG_SOLANA_RPC_URL;
const private_key_b58 = process.env.GUTENBERG_SOLANA_PRIVATE_KEY;

if (!rpc_url?.trim()) {
  console.error('Missing GUTENBERG_SOLANA_RPC_URL in .env');
  process.exit(1);
}

if (!private_key_b58?.trim()) {
  console.error('Missing GUTENBERG_SOLANA_PRIVATE_KEY in .env');
  process.exit(1);
}

const argv_amount = process.argv
  .slice(2)
  .filter((token) => token !== '--')[0];
const amount = Number(argv_amount ?? '2');

if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Amount must be a positive number (SOL)');
  process.exit(1);
}

let keypair;

try {
  keypair = Keypair.fromSecretKey(bs58.decode(private_key_b58.trim()));
} catch (cause) {
  console.error('Invalid GUTENBERG_SOLANA_PRIVATE_KEY', cause);
  process.exit(1);
}

const connection = new Connection(rpc_url.trim(), 'confirmed');
const signature = await connection.requestAirdrop(
  keypair.publicKey,
  amount * LAMPORTS_PER_SOL,
);

await connection.confirmTransaction(signature, 'confirmed');

console.log(
  `Airdropped ${amount} SOL to ${keypair.publicKey.toBase58()} (${rpc_url.trim()})`,
);
