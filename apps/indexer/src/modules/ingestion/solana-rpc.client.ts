import { Inject, Injectable, Logger } from '@nestjs/common';

import { SOLANA_RPC_URL } from '../../common/config/config.tokens';

export type RpcSignatureInfo = {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
  memo: string | null;
};

export type RpcTransactionMeta = {
  err: unknown;
  logMessages: string[] | null;
};

export type RpcTransaction = {
  slot: number;
  blockTime: number | null;
  transaction: { signatures: string[] };
  meta: RpcTransactionMeta | null;
};

type RpcResponse<T> = {
  jsonrpc: '2.0';
  id: number;
  error?: { code: number; message: string };
  result: T;
};

@Injectable()
export class SolanaRpcClient {
  private readonly logger = new Logger(SolanaRpcClient.name);
  private request_id = 0;

  constructor(@Inject(SOLANA_RPC_URL) private readonly rpc_url: string) {}

  async get_signatures_for_address(input: {
    address: string;
    limit: number;
    before?: string;
    until?: string;
  }): Promise<RpcSignatureInfo[]> {
    const options: Record<string, unknown> = {
      limit: input.limit,
      commitment: 'confirmed',
    };
    if (input.before) options.before = input.before;
    if (input.until) options.until = input.until;

    return this.call<RpcSignatureInfo[]>({
      method: 'getSignaturesForAddress',
      params: [input.address, options],
    });
  }

  async get_transaction(signature: string): Promise<RpcTransaction | null> {
    return this.call<RpcTransaction | null>({
      method: 'getTransaction',
      params: [
        signature,
        {
          encoding: 'json',
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        },
      ],
    });
  }

  async get_slot(): Promise<number> {
    return this.call<number>({
      method: 'getSlot',
      params: [{ commitment: 'confirmed' }],
    });
  }

  private async call<T>(input: {
    method: string;
    params: unknown[];
  }): Promise<T> {
    const id = ++this.request_id;

    const response = await fetch(this.rpc_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: input.method,
        params: input.params,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Solana RPC ${this.rpc_url} returned ${response.status} ${response.statusText} for ${input.method}`,
      );
    }

    const body = (await response.json()) as RpcResponse<T>;

    if (body.error) {
      throw new Error(
        `Solana RPC error (${input.method}): ${body.error.message}`,
      );
    }

    return body.result;
  }
}
