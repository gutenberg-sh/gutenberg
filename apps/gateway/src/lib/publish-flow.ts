import {
  GUTENBERG_REGISTRY_PROGRAM_ID,
  build_unsigned_manifest,
  canonical_json,
  encode_publish_release_instruction,
  encode_signature,
  find_name_address,
  find_release_address,
  guess_mime_for_path,
  manifest_hash,
  sha256_hash,
  type GutenbergManifest,
  type GutenbergManifestFile,
  type GutenbergUnsignedManifest,
  type PublishSessionInput,
  type Sha256Hash,
} from '@gutenberg/core';
import { ArweaveSigner } from '@irys/bundles';
import { WebUploader } from '@irys/web-upload';
import { WebSolana } from '@irys/web-upload-solana';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

const SYSTEM_PROGRAM_ID = SystemProgram.programId;

export type PublishFlowEvent =
  | { kind: 'preparing' }
  | { kind: 'wallet_connected'; address: string }
  | { kind: 'fund_required'; amount_atomic: string; bytes: number }
  | { kind: 'funding'; amount_atomic: string }
  | { kind: 'funded' }
  | { kind: 'manifest_signing' }
  | { kind: 'uploading_bundle'; total: number }
  | { kind: 'manifest_uploaded'; manifest_uri: string }
  | { kind: 'tx_sending' }
  | { kind: 'tx_confirmed'; signature: string };

export type PublishFlowResult = {
  manifest: GutenbergManifest;
  manifest_uri: `ar://${string}`;
  manifest_hash: Sha256Hash;
  release_address: string;
  signature: string;
  publisher: string;
};

export async function run_publish_flow(input: {
  session: PublishSessionInput;
  wallet: WalletContextState;
  irys_bundler_url: string;
  on_event: (event: PublishFlowEvent) => void;
}): Promise<PublishFlowResult> {
  const { session, wallet, irys_bundler_url, on_event } = input;

  if (!wallet.publicKey) {
    throw new Error('Wallet is not connected');
  }

  if (!wallet.signMessage) {
    throw new Error(
      "This wallet doesn't expose signMessage; pick a wallet like Phantom or Solflare.",
    );
  }

  if (!wallet.signTransaction || !wallet.sendTransaction) {
    throw new Error(
      "This wallet doesn't expose signTransaction/sendTransaction; pick a wallet like Phantom or Solflare.",
    );
  }

  const publisher = wallet.publicKey.toBase58();
  on_event({ kind: 'wallet_connected', address: publisher });

  if (!wallet.wallet?.adapter) {
    throw new Error('Connected wallet adapter is not available');
  }

  on_event({ kind: 'preparing' });

  const irys = await build_irys(
    wallet.wallet.adapter,
    session.rpc_url,
    session.irys_network,
    irys_bundler_url,
  );

  const decoded_files = session.files.map((file) => ({
    path: file.path,
    bytes: base64_decode(file.content_base64),
    size_bytes: file.size_bytes,
    mime: file.mime ?? guess_mime_for_path(file.path),
  }));

  if (session.irys_network === 'mainnet') {
    const total_bytes = decoded_files.reduce(
      (acc, f) => acc + f.size_bytes,
      0,
    );
    const manifest_size_estimate = estimate_manifest_size(
      session,
      decoded_files,
    );
    const total_with_manifest = total_bytes + manifest_size_estimate;
    const price = await irys.getPrice(total_with_manifest);
    const balance = await irys.getBalance();
    const required = price.minus(balance);

    if (required.isGreaterThan(0)) {
      on_event({
        kind: 'fund_required',
        amount_atomic: required.integerValue().toString(),
        bytes: total_with_manifest,
      });
      on_event({
        kind: 'funding',
        amount_atomic: required.integerValue().toString(),
      });

      await irys.fund(required.integerValue());

      on_event({ kind: 'funded' });
    }
  }

  // Pre-sign every file's Irys data item with a one-shot ephemeral Arweave
  // key. Irys's `uploadFolder` does the same internally, but it then makes
  // the wallet sign both the Irys folder-manifest *and* the bundle wrapper —
  // doing that ourselves cuts those popups, and lets us bundle our own
  // signed Gutenberg manifest into the same upload. The wallet is only used
  // to sign (a) the Gutenberg manifest payload, (b) the bundle wrapper, and
  // (c) the Solana publish_release tx — three popups regardless of file
  // count.
  const throwaway_key = await irys.bundles.getCryptoDriver().generateJWK();
  const ephemeral_signer = new ArweaveSigner(throwaway_key);

  const prepared_files = await Promise.all(
    decoded_files.map(async (file) => {
      const tags: { name: string; value: string }[] = file.mime
        ? [{ name: 'Content-Type', value: file.mime }]
        : [];
      const data_item = irys.bundles.createData(
        Buffer.from(file.bytes),
        ephemeral_signer,
        { tags },
      );
      await data_item.sign(ephemeral_signer);

      return { file, data_item, tx_id: data_item.id };
    }),
  );

  const files_record: Record<`/${string}`, GutenbergManifestFile> = {};
  for (const prepared of prepared_files) {
    const file_hash = sha256_hash(prepared.file.bytes);
    const entry: GutenbergManifestFile = {
      hash: file_hash,
      size_bytes: prepared.file.size_bytes,
      uri: `ar://${prepared.tx_id}`,
      ...(prepared.file.mime ? { mime: prepared.file.mime } : {}),
    };
    files_record[prepared.file.path] = entry;
  }

  const unsigned_manifest = build_unsigned_manifest({
    name: session.name,
    version: session.version,
    publisher,
    entry: session.entry,
    files: files_record,
    chain: session.chain,
    ...(session.prev_version ? { prev_version: session.prev_version } : {}),
    ...(session.license ? { license: session.license } : {}),
    ...(session.language ? { language: session.language } : {}),
  });

  on_event({ kind: 'manifest_signing' });

  const canonical_text = canonical_json(unsigned_manifest);
  const message_bytes = new TextEncoder().encode(canonical_text);
  const signature_bytes = await wallet.signMessage(message_bytes);

  const manifest = sign_into_manifest(unsigned_manifest, signature_bytes);
  const signed_canonical = canonical_json(manifest);
  const m_hash = manifest_hash(signed_canonical);

  const manifest_data_item = irys.bundles.createData(
    Buffer.from(new TextEncoder().encode(signed_canonical)),
    ephemeral_signer,
    {
      tags: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Gutenberg-Schema', value: 'gutenberg.manifest.v1' },
        { name: 'Gutenberg-Name', value: session.name },
        { name: 'Gutenberg-Version', value: session.version },
      ],
    },
  );
  await manifest_data_item.sign(ephemeral_signer);
  const manifest_uri: `ar://${string}` = `ar://${manifest_data_item.id}`;

  on_event({
    kind: 'uploading_bundle',
    total: prepared_files.length + 1,
  });

  await irys.uploader.uploadBundle(
    [...prepared_files.map((p) => p.data_item), manifest_data_item],
    { throwawayKey: throwaway_key },
  );

  on_event({ kind: 'manifest_uploaded', manifest_uri });

  on_event({ kind: 'tx_sending' });

  const signature = await send_publish_release_tx({
    wallet,
    rpc_url: session.rpc_url,
    program_id: session.chain.program_id,
    name: session.name,
    version: session.version,
    manifest_uri,
    manifest_hash: m_hash,
    content_hash: manifest.content_hash,
    content_size_bytes: manifest.content_size_bytes,
  });

  on_event({ kind: 'tx_confirmed', signature });

  const release_addr = find_release_address({
    name: session.name,
    version: session.version,
    program_id: session.chain.program_id,
  }).address;

  return {
    manifest,
    manifest_uri,
    manifest_hash: m_hash,
    release_address: release_addr,
    signature,
    publisher,
  };
}

async function build_irys(
  adapter: unknown,
  rpc_url: string,
  network: 'mainnet' | 'devnet',
  bundler_url: string,
) {
  const builder = WebUploader(WebSolana)
    .withProvider(adapter)
    .withRpc(rpc_url)
    .bundlerUrl(bundler_url)
    .withTokenOptions({ disablePriorityFees: true });

  const configured = network === 'mainnet' ? builder.mainnet() : builder.devnet();

  return configured.build();
}

function sign_into_manifest(
  unsigned: GutenbergUnsignedManifest,
  signature_bytes: Uint8Array,
): GutenbergManifest {
  if (signature_bytes.byteLength !== 64) {
    throw new Error(
      `Wallet returned a ${signature_bytes.byteLength}-byte value; expected 64-byte ed25519 signature.`,
    );
  }

  return {
    ...unsigned,
    signature: encode_signature(signature_bytes),
  };
}

async function send_publish_release_tx(input: {
  wallet: WalletContextState;
  rpc_url: string;
  program_id: string;
  name: string;
  version: string;
  manifest_uri: `ar://${string}`;
  manifest_hash: Sha256Hash;
  content_hash: Sha256Hash;
  content_size_bytes: number;
}): Promise<string> {
  const { wallet, rpc_url, program_id, name, version, manifest_uri } = input;

  if (!wallet.publicKey) {
    throw new Error('Wallet disconnected mid-flow');
  }

  if (program_id !== GUTENBERG_REGISTRY_PROGRAM_ID) {
    throw new Error(
      `Refusing to publish to unexpected program id ${program_id}`,
    );
  }

  const program_pubkey = new PublicKey(program_id);
  const release_addr = new PublicKey(
    find_release_address({
      name,
      version,
      program_id,
    }).address,
  );
  const name_addr = new PublicKey(
    find_name_address({ name, program_id }).address,
  );

  const data = encode_publish_release_instruction({
    name,
    version,
    manifest_uri,
    manifest_hash: input.manifest_hash,
    content_hash: input.content_hash,
    content_size_bytes: input.content_size_bytes,
  });

  const ix = new TransactionInstruction({
    programId: program_pubkey,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: name_addr, isSigner: false, isWritable: true },
      { pubkey: release_addr, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  const connection = new Connection(rpc_url, 'confirmed');
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  const tx = new Transaction({
    feePayer: wallet.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(ix);

  if (!wallet.signTransaction) {
    throw new Error('Connected wallet does not support signTransaction');
  }

  const signed_tx = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(
    signed_tx.serialize(),
    { skipPreflight: false },
  );

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );

  return signature;
}

function base64_decode(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }

  return out;
}

function estimate_manifest_size(
  session: PublishSessionInput,
  files: ReadonlyArray<{
    path: `/${string}`;
    size_bytes: number;
    mime?: string;
  }>,
): number {
  const sample_files: Record<`/${string}`, GutenbergManifestFile> = {};
  for (const f of files) {
    sample_files[f.path] = {
      hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      size_bytes: f.size_bytes,
      uri: 'ar://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ...(f.mime ? { mime: f.mime } : {}),
    };
  }

  const sample = build_unsigned_manifest({
    name: session.name,
    version: session.version,
    publisher: '11111111111111111111111111111111',
    entry: session.entry,
    files: sample_files,
    chain: session.chain,
  });

  const text = canonical_json({
    ...sample,
    signature:
      'ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  });

  return new TextEncoder().encode(text).byteLength;
}
