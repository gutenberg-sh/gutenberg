import { Inject, Injectable } from '@nestjs/common';
import type BaseNodeIrys from '@irys/upload/dist/types/base';
import Uploader from '@irys/upload';
import Solana from '@irys/upload-solana';
import bs58 from 'bs58';

import {
  ARWEAVE_GATEWAY_URLS,
  IRYS_NETWORK,
  SOLANA_RPC_URL,
} from '../../common/config/config.tokens';
import {
  content_uri_from_tx_id,
  is_content_uri,
  tx_id_from_content_uri,
} from '../../common/helpers/content-uri';
import type { ContentUri } from '../../common/types/manifest.types';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';

const ARWEAVE_TX_ID_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const PLACEHOLDER_TX_ID = 'x'.repeat(43);
const GATEWAY_FETCH_TIMEOUT_MS = 8_000;

export type UploadCostEstimate = {
  bytes: number;
  atomic_units: string;
  display_amount: string;
  ticker: string;
};

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

@Injectable()
export class StorageService {
  private client_promise?: Promise<BaseNodeIrys>;

  constructor(
    private readonly wallet_repository: SolanaWalletRepository,
    @Inject(SOLANA_RPC_URL) private readonly rpc_url: string,
    @Inject(ARWEAVE_GATEWAY_URLS) private readonly arweave_gateways: readonly string[],
    @Inject(IRYS_NETWORK)
    private readonly network: 'mainnet' | 'devnet',
  ) {}

  async put_file(data: Buffer, mime?: string): Promise<ContentUri> {
    return this.upload(data, mime);
  }

  async put_manifest(data: Buffer | string): Promise<ContentUri> {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);

    return this.upload(bytes, 'application/json');
  }

  get_gateways(): readonly string[] {
    return this.arweave_gateways;
  }

  resolve_content_url(uri: string, gateway?: string): string {
    if (!is_content_uri(uri)) {
      return uri;
    }

    const tx_id = tx_id_from_content_uri(uri);
    const base = (gateway ?? this.arweave_gateways[0]!).replace(/\/$/, '');

    return `${base}/${encodeURIComponent(tx_id)}`;
  }

  async get_blob(
    uri: string,
    validate?: (
      bytes: Buffer,
    ) => Promise<true | string> | (true | string),
  ): Promise<Buffer> {
    if (!is_content_uri(uri)) {
      return this.fetch_one(uri);
    }

    const errors: string[] = [];

    for (const gateway of this.arweave_gateways) {
      const url = this.resolve_content_url(uri, gateway);

      try {
        const bytes = await this.fetch_one(url);

        if (validate) {
          const verdict = await validate(bytes);

          if (verdict !== true) {
            errors.push(`${new URL(gateway).host}: ${verdict}`);
            continue;
          }
        }

        return bytes;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${new URL(gateway).host}: ${message}`);
      }
    }

    throw new Error(
      `Failed to fetch ${uri} from all ${this.arweave_gateways.length} gateways:\n  - ${errors.join('\n  - ')}`,
    );
  }

  async check_connection(): Promise<void> {
    const irys = await this.get_client();

    await irys.getPrice(1);
  }

  async get_bundler_balance() {
    const irys = await this.get_client();

    return irys.getBalance();
  }

  async estimate_cost(bytes: number): Promise<UploadCostEstimate> {
    const irys = await this.get_client();
    const atomic = await irys.getPrice(bytes);
    const display = irys.utils.fromAtomic(atomic);

    return {
      bytes,
      atomic_units: atomic.toFixed(0),
      display_amount: display.toString(),
      ticker: irys.tokenConfig.ticker,
    };
  }

  placeholder_content_uri(): ContentUri {
    return content_uri_from_tx_id(PLACEHOLDER_TX_ID);
  }

  static is_arweave_tx_id(value: string): boolean {
    return ARWEAVE_TX_ID_PATTERN.test(value);
  }

  private async fetch_one(url: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GATEWAY_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept: 'application/octet-stream,application/json;q=0.9,*/*;q=0.8',
        },
      });

      if (response.status === 404) {
        throw new Error(`404 not found at ${url}`);
      }

      if (!response.ok) {
        throw new Error(
          `GET failed (${response.status} ${response.statusText}) at ${url}`,
        );
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('aborted'))
      ) {
        throw new Error(`timeout after ${GATEWAY_FETCH_TIMEOUT_MS}ms`, {
          cause: error,
        });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async upload(body: Buffer, mime?: string): Promise<ContentUri> {
    const irys = await this.get_client();
    const tags =
      mime !== undefined
        ? [{ name: 'Content-Type', value: mime }]
        : [];
    const result = await irys.upload(body, { tags });
    const tx_id = extract_irys_tx_id(result);

    return content_uri_from_tx_id(tx_id);
  }

  private async get_client(): Promise<BaseNodeIrys> {
    if (!this.client_promise) {
      this.client_promise = this.build_client();
    }

    return this.client_promise;
  }

  private async build_client(): Promise<BaseNodeIrys> {
    const keypair = await this.wallet_repository.load_keypair();
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
