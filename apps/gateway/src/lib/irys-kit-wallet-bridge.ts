import type { WalletSession } from '@solana/client';
import { fromLegacyTransactionInstruction } from '@solana/compat';
import type { Blockhash } from '@solana/kit';
import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import { getTransactionEncoder } from '@solana/transactions';
import type { Connection, Transaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';

/**
 * Signs a legacy web3.js `Transaction` with a Kit `WalletSession` and submits its raw bytes.
 * Used for Irys funding txs and for Gutenberg `publish_release` (avoids `@solana/client`
 * `prepareAndSend` instruction-plan execution, which fails on some Anchor init flows).
 */
export async function sign_legacy_transaction_and_send_raw(input: {
  session: WalletSession;
  legacy_tx: Transaction;
  connection: Connection;
  skipPreflight?: boolean;
}): Promise<string> {
  const { session, legacy_tx, connection } = input;
  const skip_preflight = input.skipPreflight ?? false;

  if (!session.signTransaction) {
    throw new Error(
      "This wallet doesn't expose signTransaction; pick a wallet like Phantom or Solflare.",
    );
  }

  const sign_transaction = session.signTransaction.bind(session);

  const fee_payer = legacy_tx.feePayer;
  const recent_blockhash = legacy_tx.recentBlockhash;
  if (!fee_payer || !recent_blockhash) {
    throw new Error('Transaction is missing fee payer or recent blockhash');
  }

  const last_valid =
    legacy_tx.lastValidBlockHeight !== undefined
      ? BigInt(legacy_tx.lastValidBlockHeight)
      : 0n;

  const lifetime = {
    blockhash: recent_blockhash as Blockhash,
    lastValidBlockHeight: last_valid,
  };

  let message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(address(fee_payer.toBase58()), m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
  ) as Parameters<typeof appendTransactionMessageInstruction>[1];

  for (const ix of legacy_tx.instructions) {
    message = appendTransactionMessageInstruction(
      fromLegacyTransactionInstruction(ix),
      message,
    );
  }

  const compiled = compileTransaction(
    message as Parameters<typeof compileTransaction>[0],
  );
  const signed = await sign_transaction(compiled as never);
  const wire = getTransactionEncoder().encode(signed);

  return connection.sendRawTransaction(Buffer.from(wire), {
    skipPreflight: skip_preflight,
  });
}

/**
 * Minimal wallet shape for @irys/web-upload-solana: legacy `publicKey`, `signMessage`,
 * and `sendTransaction(tx, connection)` where `tx` is a legacy web3 `Transaction`.
 */
export function create_irys_kit_wallet_provider(session: WalletSession) {
  if (!session.signMessage) {
    throw new Error(
      "This wallet doesn't expose signMessage; pick a wallet like Phantom or Solflare.",
    );
  }
  if (!session.signTransaction) {
    throw new Error(
      "This wallet doesn't expose signTransaction; pick a wallet like Phantom or Solflare.",
    );
  }

  const sign_message = session.signMessage.bind(session);

  return {
    publicKey: new PublicKey(session.account.address.toString()),
    signMessage: sign_message,

    async sendTransaction(
      legacy_tx: Transaction,
      connection: Connection,
      options?: { skipPreflight?: boolean },
    ): Promise<string> {
      return sign_legacy_transaction_and_send_raw({
        session,
        legacy_tx,
        connection,
        skipPreflight: options?.skipPreflight,
      });
    },
  };
}
