import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_BUCKET_KEY } from '../config/config.symbols';
import {
  sha256_prefix,
  type ContentUri,
  type Sha256Hash,
} from '../manifest/manifest.types';
import { ManifestService } from '../manifest/manifest.service';

import { S3StorageRepository } from './s3-storage.repository';
import type { ContentStore } from './storage.types';

@Injectable()
export class StorageService implements ContentStore {
  constructor(
    @Inject(STORAGE_BUCKET_KEY) private readonly storageBucket: string,
    private readonly manifestService: ManifestService,
    private readonly s3StorageRepository: S3StorageRepository,
  ) {}

  async put_blob(data: Buffer | string): Promise<ContentUri> {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const hash = this.manifestService.sha256_hash(bytes);
    const key = this.blob_key(hash);

    await this.s3StorageRepository.put_object({
      key,
      body: bytes,
      content_type: 'application/octet-stream',
    });

    return this.to_uri(key);
  }

  async put_manifest(data: Buffer | string): Promise<ContentUri> {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const hash = this.manifestService.sha256_hash(bytes);
    const key = this.manifest_key(hash);

    await this.s3StorageRepository.put_object({
      key,
      body: bytes,
      content_type: 'application/json',
    });

    return this.to_uri(key);
  }

  async get_blob(uri: ContentUri): Promise<Buffer> {
    return this.s3StorageRepository.get_object(this.key_from_uri(uri));
  }

  private blob_key(hash: Sha256Hash): string {
    return `blobs/sha256/${hash.slice(sha256_prefix.length)}`;
  }

  private manifest_key(hash: Sha256Hash): string {
    return `manifests/sha256/${hash.slice(sha256_prefix.length)}.json`;
  }

  private to_uri(key: string): ContentUri {
    return `s3://${this.storageBucket}/${key}`;
  }

  private key_from_uri(uri: ContentUri): string {
    const prefix = `s3://${this.storageBucket}/`;

    if (!uri.startsWith(prefix)) {
      throw new Error(`Unsupported storage URI: ${uri}`);
    }

    return uri.slice(prefix.length);
  }
}
