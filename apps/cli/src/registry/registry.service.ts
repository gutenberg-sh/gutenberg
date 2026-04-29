import { Inject, Injectable } from '@nestjs/common';

import { ManifestService } from '../manifest/manifest.service';

import {
  release_event_type,
  type FindReleaseInput,
  type HasReleaseInput,
  type ReleaseRegistryRepository,
  type GutenbergReleaseEventV0,
} from './registry.types';
import { RELEASE_REGISTRY_REPOSITORY } from './registry.tokens';

@Injectable()
export class RegistryService {
  constructor(
    private readonly manifestService: ManifestService,
    @Inject(RELEASE_REGISTRY_REPOSITORY)
    private readonly releaseRegistryRepository: ReleaseRegistryRepository,
  ) {}

  async assert_can_publish(): Promise<void> {
    await this.releaseRegistryRepository.assert_can_publish();
  }

  async append_release(event: GutenbergReleaseEventV0): Promise<void> {
    this.assert_valid_release_event(event);

    await this.releaseRegistryRepository.publish_release(event);
  }

  async list_releases(): Promise<GutenbergReleaseEventV0[]> {
    const releases = await this.releaseRegistryRepository.list_releases();

    return releases.filter((release) => this.is_valid_release_event(release));
  }

  async find_release(
    input: FindReleaseInput,
  ): Promise<GutenbergReleaseEventV0 | undefined> {
    const release = await this.releaseRegistryRepository.find_release(input);

    if (!release) {
      return undefined;
    }

    if (!this.is_valid_release_event(release)) {
      throw new Error('Registry returned an invalid release event');
    }

    return release;
  }

  async has_release(input: HasReleaseInput): Promise<boolean> {
    return this.releaseRegistryRepository.has_release(input);
  }

  is_valid_release_event(event: unknown): event is GutenbergReleaseEventV0 {
    try {
      this.assert_valid_release_event(event);
      return true;
    } catch {
      return false;
    }
  }

  assert_valid_release_event(
    event: unknown,
  ): asserts event is GutenbergReleaseEventV0 {
    if (typeof event !== 'object' || event === null || Array.isArray(event)) {
      throw new Error('Release event must be an object');
    }

    if (
      !this.has_exact_keys(event, [
        'type',
        'name',
        'version',
        'manifest',
        'manifest_hash',
        'publisher',
        'created_at',
      ])
    ) {
      throw new Error('Release event has invalid fields');
    }

    if (event.type !== release_event_type) {
      throw new Error(`Release event type must be ${release_event_type}`);
    }

    if (
      typeof event.name !== 'string' ||
      !/^[a-z0-9][a-z0-9._-]*$/.test(event.name)
    ) {
      throw new Error('Release event name is invalid');
    }

    if (typeof event.version !== 'string' || event.version.length === 0) {
      throw new Error('Release event version is required');
    }

    if (
      typeof event.manifest !== 'string' ||
      !event.manifest.startsWith('s3://')
    ) {
      throw new Error('Release event manifest must be an s3:// URI');
    }

    if (
      typeof event.manifest_hash !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(event.manifest_hash)
    ) {
      throw new Error('Release event manifest_hash must be a sha256 hex digest');
    }

    if (typeof event.publisher !== 'string') {
      throw new Error('Release event publisher must be a Solana public key');
    }
    this.manifestService.decode_publisher_public_key(event.publisher);

    if (
      typeof event.created_at !== 'string' ||
      Number.isNaN(Date.parse(event.created_at))
    ) {
      throw new Error('Release event created_at must be an ISO timestamp');
    }
  }

  private has_exact_keys(
    value: object,
    keys: readonly string[],
  ): value is Record<string, unknown> {
    const actual = Object.keys(value);

    return (
      actual.length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key))
    );
  }
}
