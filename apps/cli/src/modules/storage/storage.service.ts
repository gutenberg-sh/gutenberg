import { Inject, Injectable } from '@nestjs/common';
import type BaseNodeIrys from '@irys/upload/dist/types/base';
import Uploader from '@irys/upload';
import Solana from '@irys/upload-solana';
import bs58 from 'bs58';

import {
  ARWEAVE_GATEWAY_URL,
  IRYS_NETWORK,
  SOLANA_RPC_URL,
} from '../../common/config/config.tokens';
import type { ContentUri } from '../../common/types/manifest.types';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

const ARWEAVE_TX_ID_PATTERN = /^[A-Za-z0-9+/=_-]{32,128}$/;

function content_type_for_filename(filename: string): string {
  if (filename.endsWith('.json')) {
    return 'application/json';
  }

  if (filename.endsWith('.tar')) {
    return 'application/x-tar';
  }

  return 'application/octet-stream';
}

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

function resolve_arweave_fetch_url(url: string, gateway: string): string {
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

  if (!ARWEAVE_TX_ID_PATTERN.test(last)) {
    return url;
  }

  const base = gateway.replace(/\/$/, '');

  return `${base}/${encodeURIComponent(last)}`;
}

@Injectable()
export class StorageService {
  private client_promise?: Promise<BaseNodeIrys>;

  constructor(
    private readonly wallet_repository: SolanaWalletRepository,
    @Inject(SOLANA_RPC_URL) private readonly rpc_url: string,
    @Inject(ARWEAVE_GATEWAY_URL) private readonly arweave_gateway: string,
    @Inject(IRYS_NETWORK)
    private readonly network: 'mainnet' | 'devnet',
  ) {}

  async put_blob(data: Buffer | string): Promise<ContentUri> {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);

    return this.upload(bytes, 'bundle.tar');
  }

  async put_manifest(data: Buffer | string): Promise<ContentUri> {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);

    return this.upload(bytes, 'manifest.json');
  }

  async get_blob(uri: ContentUri): Promise<Buffer> {
    const resolved = resolve_arweave_fetch_url(uri, this.arweave_gateway);
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

  /**
   * Upload bytes via Irys (Solana-paid); returns an HTTPS URL under {@link arweave_gateway}.
   */
  private async upload(body: Buffer, filename: string): Promise<ContentUri> {
    const irys = await this.get_client();
    const tags = [
      { name: 'Content-Type', value: content_type_for_filename(filename) },
    ];
    const result = await irys.upload(body, { tags });
    const tx_id = extract_irys_tx_id(result);
    const base = this.arweave_gateway.replace(/\/$/, '');

    return `${base}/${tx_id}`;
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
