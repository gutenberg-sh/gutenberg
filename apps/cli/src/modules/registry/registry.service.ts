import {
  decode_publisher_public_key,
  is_content_uri,
  is_sha256_hash,
} from '@gutenberg/core';
import { Injectable } from '@nestjs/common';

import {
  release_event_type,
  type ClaimNameInput,
  type FindReleaseInput,
  type GutenbergReleaseEvent,
  type HasReleaseInput,
} from './registry.types';
import { SolanaRegistryRepository } from './solana-registry.repository';

@Injectable()
export class RegistryService {
  constructor(private readonly registry_repository: SolanaRegistryRepository) {}

  async assert_name_claimable(input: ClaimNameInput): Promise<void> {
    await this.registry_repository.assert_name_claimable(input);
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

  release_address(input: { name: string; version: string }): string {
    return this.registry_repository.release_address(input);
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

    const value = event as Record<string, unknown>;

    if (value.type !== release_event_type) {
      throw new Error(`Release event type must be ${release_event_type}`);
    }

    if (
      typeof value.schema_version !== 'number' ||
      !Number.isInteger(value.schema_version)
    ) {
      throw new Error('Release event schema_version must be an integer');
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
      throw new Error('Release event manifest must be an ar:// content uri');
    }

    if (
      typeof value.manifest_hash !== 'string' ||
      !is_sha256_hash(value.manifest_hash)
    ) {
      throw new Error('Release event manifest_hash must be sha256:<64 hex>');
    }

    if (
      typeof value.content_hash !== 'string' ||
      !is_sha256_hash(value.content_hash)
    ) {
      throw new Error('Release event content_hash must be sha256:<64 hex>');
    }

    if (
      typeof value.content_size_bytes !== 'number' ||
      !Number.isInteger(value.content_size_bytes) ||
      value.content_size_bytes < 0
    ) {
      throw new Error(
        'Release event content_size_bytes must be a non-negative integer',
      );
    }

    if (typeof value.publisher !== 'string') {
      throw new Error('Release event publisher must be a Solana public key');
    }
    decode_publisher_public_key(value.publisher);

    if (
      typeof value.created_at !== 'string' ||
      Number.isNaN(Date.parse(value.created_at))
    ) {
      throw new Error('Release event created_at must be an ISO timestamp');
    }

    if (
      typeof value.created_at_slot !== 'number' ||
      !Number.isInteger(value.created_at_slot)
    ) {
      throw new Error('Release event created_at_slot must be an integer');
    }
  }
}
