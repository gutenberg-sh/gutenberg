import { Inject, Injectable } from '@nestjs/common';
import { sign, verify } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

import { signature_prefix } from '../manifest/manifest.types';
import { ManifestService } from '../manifest/manifest.service';

import {
  release_event_type,
  type FindReleaseInput,
  type HasReleaseInput,
  type ReleaseRegistryRepository,
  type VeritasReleaseEventV0,
  type VeritasUnsignedReleaseEventV0,
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

  async append_release(event: VeritasReleaseEventV0): Promise<void> {
    if (!this.verify_release_event(event)) {
      throw new Error('Registry release event signature verification failed');
    }

    await this.releaseRegistryRepository.publish_release(event);
  }

  async list_releases(): Promise<VeritasReleaseEventV0[]> {
    const releases = await this.releaseRegistryRepository.list_releases();

    return releases.filter((release) => this.verify_release_event(release));
  }

  async find_release(
    input: FindReleaseInput,
  ): Promise<VeritasReleaseEventV0 | undefined> {
    const release = await this.releaseRegistryRepository.find_release(input);

    if (!release) {
      return undefined;
    }

    if (!this.verify_release_event(release)) {
      throw new Error('Registry returned an invalid release event');
    }

    return release;
  }

  async has_release(input: HasReleaseInput): Promise<boolean> {
    return this.releaseRegistryRepository.has_release(input);
  }

  sign_release_event(
    unsigned_event: VeritasUnsignedReleaseEventV0,
    private_key: KeyObject,
  ): VeritasReleaseEventV0 {
    if (
      private_key.type !== 'private' ||
      private_key.asymmetricKeyType !== 'ed25519'
    ) {
      throw new Error('Expected an Ed25519 private key');
    }

    this.assert_valid_unsigned_release_event(unsigned_event);

    const signature = sign(
      null,
      Buffer.from(this.manifestService.canonical_json(unsigned_event)),
      private_key,
    );

    return {
      ...unsigned_event,
      signature: `${signature_prefix}${signature.toString('base64url')}`,
    };
  }

  verify_release_event(event: unknown): event is VeritasReleaseEventV0 {
    try {
      this.assert_valid_release_event(event);

      const { signature, ...unsigned_event } = event;
      const public_key =
        this.manifestService.decode_publisher_public_key(event.publisher);
      const signature_bytes = Buffer.from(
        signature.slice(signature_prefix.length),
        'base64url',
      );

      return verify(
        null,
        Buffer.from(this.manifestService.canonical_json(unsigned_event)),
        public_key,
        signature_bytes,
      );
    } catch {
      return false;
    }
  }

  private assert_valid_release_event(
    event: unknown,
  ): asserts event is VeritasReleaseEventV0 {
    if (typeof event !== 'object' || event === null || Array.isArray(event)) {
      throw new Error('Release event must be an object');
    }

    if (
      !this.has_exact_keys(event, [
        'type',
        'name',
        'version',
        'manifest',
        'publisher',
        'created_at',
        'signature',
      ])
    ) {
      throw new Error('Release event has invalid fields');
    }

    if (!this.is_prefixed_base64url(event.signature, signature_prefix)) {
      throw new Error(
        'Release event signature must be an ed25519 base64url value',
      );
    }

    const { signature: _signature, ...unsigned_event } = event;
    this.assert_valid_unsigned_release_event(unsigned_event);
  }

  private assert_valid_unsigned_release_event(
    event: unknown,
  ): asserts event is VeritasUnsignedReleaseEventV0 {
    if (typeof event !== 'object' || event === null || Array.isArray(event)) {
      throw new Error('Release event must be an object');
    }

    if (
      !this.has_exact_keys(event, [
        'type',
        'name',
        'version',
        'manifest',
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

  private is_prefixed_base64url<const Prefix extends string>(
    value: unknown,
    prefix: Prefix,
  ): value is `${Prefix}${string}` {
    return (
      typeof value === 'string' &&
      value.startsWith(prefix) &&
      value.length > prefix.length &&
      /^[A-Za-z0-9_-]+$/.test(value.slice(prefix.length))
    );
  }
}
