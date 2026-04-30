import { Inject, Injectable } from '@nestjs/common';
import type BaseNodeIrys from '@irys/upload/dist/types/base';
import Uploader from '@irys/upload';
import Solana from '@irys/upload-solana';
import bs58 from 'bs58';

import {
  ARWEAVE_GATEWAY_URL_KEY,
  IRYS_NETWORK_KEY,
  SOLANA_RPC_URL_KEY,
} from '../config/config.symbols';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

function content_type_for_filename(filename: string): string {
  if (filename.endsWith('.json')) {
    return 'application/json';
  }

  if (filename.endsWith('.tar')) {
    return 'application/x-tar';
  }

  return 'application/octet-stream';
}

/** Inline and chunked uploads may expose `id` at the top level or under nested `data` receipts. */
function extract_irys_tx_id(result: unknown): string {
  const try_object = (value: unknown): string | undefined => {
    if (value === null || typeof value !== 'object') {
      return undefined;
    }

    const o = value as Record<string, unknown>;

    if (typeof o.id === 'string' && o.id.length > 0) {
      return o.id;
    }

    return undefined;
  };

  if (result !== null && typeof result === 'object') {
    const top = try_object(result);

    if (top !== undefined) {
      return top;
    }

    const outer = result as Record<string, unknown>;
    const nested = outer.data;

    if (nested !== null && typeof nested === 'object') {
      const mid = try_object(nested);

      if (mid !== undefined) {
        return mid;
      }

      const inner = (nested as Record<string, unknown>).data;

      if (inner !== null && typeof inner === 'object') {
        const deep = try_object(inner);

        if (deep !== undefined) {
          return deep;
        }
      }
    }
  }

  throw new Error(
    `Unexpected Irys upload response (missing id): ${typeof result === 'string' ? result : JSON.stringify(result)}`,
  );
}

/**
 * `https://arweave.net/{id}` serves an HTML Permaweb shell for browsers, not raw bytes.
 * Irys receipts resolve through `https://gateway.irys.xyz/{id}` (redirects to CDN with JSON/tar).
 */
function resolve_arweave_fetch_url(url: string): string {
  let parsed: URL;

  try {
    parsed = new URL(url.trim());
  } catch {
    return url;
  }

  const host = parsed.hostname.toLowerCase();

  if (host !== 'arweave.net' && host !== 'www.arweave.net') {
    return url;
  }

  const segments = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');

  if (segments.length === 0) {
    return url;
  }

  const raw_segment = segments[segments.length - 1];

  if (raw_segment === undefined || raw_segment.length === 0) {
    return url;
  }

  let last: string;

  try {
    last = decodeURIComponent(raw_segment);
  } catch {
    last = raw_segment;
  }

  const looks_like_tx_id = /^[A-Za-z0-9+/=_-]{32,128}$/.test(last);

  if (!looks_like_tx_id) {
    return url;
  }

  return `https://gateway.irys.xyz/${encodeURIComponent(last)}`;
}

@Injectable()
export class IrysStorageRepository {
  private client_promise?: Promise<BaseNodeIrys>;

  constructor(
    private readonly wallet_repository: SolanaWalletRepository,
    @Inject(SOLANA_RPC_URL_KEY) private readonly rpc_url: string,
    @Inject(ARWEAVE_GATEWAY_URL_KEY) private readonly arweave_gateway: string,
    @Inject(IRYS_NETWORK_KEY)
    private readonly network: 'mainnet' | 'devnet',
  ) {}

  /**
   * Upload bytes via Irys (Solana-paid); returns an HTTPS URL under {@link arweave_gateway}.
   */
  async add_bytes(body: Buffer, filename: string): Promise<string> {
    const irys = await this.get_client();
    const tags = [
      { name: 'Content-Type', value: content_type_for_filename(filename) },
    ];
    const result = await irys.upload(body, { tags });

    return this.gateway_object_url(extract_irys_tx_id(result));
  }

  gateway_object_url(tx_id: string): string {
    const base = this.arweave_gateway.replace(/\/$/, '');

    return `${base}/${tx_id}`;
  }

  async get(url: string): Promise<Buffer> {
    const resolved = resolve_arweave_fetch_url(url);
    const response = await fetch(resolved, {
      redirect: 'follow',
      headers: {
        Accept: 'application/octet-stream,application/json;q=0.9,*/*;q=0.8',
      },
    });

    if (response.status === 404) {
      throw new Error(`Content not found: ${resolved}`);
    }

    if (!response.ok) {
      throw new Error(
        `GET failed (${response.status}) for ${resolved}: ${response.statusText}`,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async check_connection(): Promise<void> {
    const irys = await this.get_client();

    await irys.getPrice(1);
  }

  async get_bundler_balance() {
    const irys = await this.get_client();

    return irys.getBalance();
  }

  private async get_client(): Promise<BaseNodeIrys> {
    if (!this.client_promise) {
      this.client_promise = this.build_client();
    }

    return this.client_promise;
  }

  private async build_client(): Promise<BaseNodeIrys> {
    const keypair = this.wallet_repository.load_keypair();
    const wallet_secret = bs58.encode(keypair.secretKey);

    const builder = Uploader(Solana)
      .withWallet(wallet_secret)
      .withRpc(this.rpc_url);

    if (this.network === 'mainnet') {
      builder.mainnet();
    } else {
      builder.devnet();
    }

    const irys = await builder.build();

    await irys.ready();

    return irys;
  }
}
