import { Injectable } from '@nestjs/common';

import { is_content_uri } from '../../common/helpers/content-uri';
import { ManifestService } from '../manifest/manifest.service';

import {
  release_event_type,
  type ClaimNameInput,
  type FindReleaseInput,
  type GutenbergReleaseEvent,
  type HasReleaseInput,
  type UnpublishBatchInput,
  type UnpublishInput,
} from './registry.types';
import { SolanaRegistryRepository } from './solana-registry.repository';

@Injectable()
export class RegistryService {
  constructor(
    private readonly manifest_service: ManifestService,
    private readonly registry_repository: SolanaRegistryRepository,
  ) {}

  async assert_can_publish(): Promise<void> {
    const { public_key, sol } = await this.registry_repository.get_wallet_balance();

    if (sol === 0) {
      throw new Error(
        `Solana wallet ${public_key.toBase58()} has 0 SOL on the configured RPC cluster`,
      );
    }
  }

  async assert_name_claimable(input: ClaimNameInput): Promise<void> {
    await this.registry_repository.assert_name_claimable(input);
  }

  async append_release(event: GutenbergReleaseEvent): Promise<void> {
    this.assert_valid_release_event(event);

    await this.registry_repository.publish_release(event);
  }

  async unpublish_release(input: UnpublishInput): Promise<void> {
    await this.registry_repository.unpublish_release(input);
  }

  async unpublish_releases_batch(input: UnpublishBatchInput): Promise<void> {
    await this.registry_repository.unpublish_releases_batch(input);
  }

  async list_releases(): Promise<GutenbergReleaseEvent[]> {
    const releases = await this.registry_repository.list_releases();

    return releases.filter((release) => this.is_valid_release_event(release));
  }

  async find_release(
    input: FindReleaseInput,
  ): Promise<GutenbergReleaseEvent | undefined> {
    const release = await this.registry_repository.find_release(input);

    if (!release) {
      return undefined;
    }

    if (!this.is_valid_release_event(release)) {
      throw new Error('Registry returned an invalid release event');
    }

    return release;
  }

  async has_release(input: HasReleaseInput): Promise<boolean> {
    return this.registry_repository.has_release(input);
  }

  release_address(input: {
    publisher: string;
    name: string;
    version: string;
  }): string {
    return this.registry_repository.release_address(input).toBase58();
  }

  is_valid_release_event(event: unknown): event is GutenbergReleaseEvent {
    try {
      this.assert_valid_release_event(event);
      return true;
    } catch {
      return false;
    }
  }

  assert_valid_release_event(
    event: unknown,
  ): asserts event is GutenbergReleaseEvent {
    if (typeof event !== 'object' || event === null || Array.isArray(event)) {
      throw new Error('Release event must be an object');
    }

    const expected = [
      'type',
      'name',
      'version',
      'manifest',
      'manifest_hash',
      'publisher',
      'created_at',
    ] as const;
    const actual = Object.keys(event);

    if (
      actual.length !== expected.length ||
      !expected.every((key) => Object.hasOwn(event, key))
    ) {
      throw new Error('Release event has invalid fields');
    }

    const value = event as Record<string, unknown>;

    if (value.type !== release_event_type) {
      throw new Error(`Release event type must be ${release_event_type}`);
    }

    if (
      typeof value.name !== 'string' ||
      !/^[a-z0-9][a-z0-9._-]*$/.test(value.name)
    ) {
      throw new Error('Release event name is invalid');
    }

    if (typeof value.version !== 'string' || value.version.length === 0) {
      throw new Error('Release event version is required');
    }

    if (typeof value.manifest !== 'string' || !is_content_uri(value.manifest)) {
      throw new Error(
        'Release event manifest must be an http(s) URL (.../{tx id})',
      );
    }

    if (
      typeof value.manifest_hash !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(value.manifest_hash)
    ) {
      throw new Error(
        'Release event manifest_hash must be a sha256 hex digest',
      );
    }

    if (typeof value.publisher !== 'string') {
      throw new Error('Release event publisher must be a Solana public key');
    }
    this.manifest_service.decode_publisher_public_key(value.publisher);

    if (
      typeof value.created_at !== 'string' ||
      Number.isNaN(Date.parse(value.created_at))
    ) {
      throw new Error('Release event created_at must be an ISO timestamp');
    }
  }
}
