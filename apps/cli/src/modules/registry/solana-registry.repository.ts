import { Inject, Injectable } from '@nestjs/common';
import {
  GUTENBERG_REGISTRY_PROGRAM_ID as CORE_PROGRAM_ID,
  fetch_name_authority,
  fetch_release_by_name_at_version,
  find_name_address,
  find_release_address,
  list_releases,
} from '@gutenberg/core';

import { SOLANA_RPC_URL } from '../../common/config/config.tokens';

import type {
  FindReleaseInput,
  GutenbergReleaseEvent,
  HasReleaseInput,
} from './registry.types';

export const GUTENBERG_REGISTRY_PROGRAM_ID = CORE_PROGRAM_ID;

@Injectable()
export class SolanaRegistryRepository {
  constructor(@Inject(SOLANA_RPC_URL) private readonly rpc_url: string) {}

  program_id(): string {
    return GUTENBERG_REGISTRY_PROGRAM_ID;
  }

  async assert_name_claimable(input: {
    name: string;
    publisher: string;
  }): Promise<void> {
    const { address } = find_name_address({ name: input.name });
    const authority = await fetch_name_authority({
      rpc_url: this.rpc_url,
      name: input.name,
      address,
    });

    if (!authority) {
      return;
    }

    if (authority !== input.publisher) {
      throw new Error(
        `Release name "${input.name}" is already claimed by publisher ${authority}`,
      );
    }
  }

  async check_rpc_connection(): Promise<string> {
    const response = await fetch(this.rpc_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion',
        params: [],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Solana RPC ${this.rpc_url} returned ${response.status} ${response.statusText}`,
      );
    }

    const body = (await response.json()) as {
      error?: { message: string };
      result?: { 'solana-core': string };
    };

    if (body.error) {
      throw new Error(`Solana RPC error: ${body.error.message}`);
    }

    return body.result?.['solana-core'] ?? 'unknown';
  }

  async list_releases(): Promise<GutenbergReleaseEvent[]> {
    return list_releases({ rpc_url: this.rpc_url });
  }

  async find_release(
    input: FindReleaseInput,
  ): Promise<GutenbergReleaseEvent | undefined> {
    if (input.version) {
      const result = await fetch_release_by_name_at_version({
        rpc_url: this.rpc_url,
        name: input.name,
        version: input.version,
      });

      return result?.release;
    }

    const releases = await this.list_releases();

    return releases.filter((event) => event.name === input.name).at(-1);
  }

  async has_release(input: HasReleaseInput): Promise<boolean> {
    const result = await fetch_release_by_name_at_version({
      rpc_url: this.rpc_url,
      name: input.name,
      version: input.version,
    });

    return result !== undefined;
  }

  release_address(input: { name: string; version: string }): string {
    return find_release_address(input).address;
  }
}
