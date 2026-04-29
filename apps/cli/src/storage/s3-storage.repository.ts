import {
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_BUCKET_KEY, STORAGE_ENDPOINT_KEY } from '../config/config.symbols';

@Injectable()
export class S3StorageRepository {
  constructor(
    private readonly client: S3Client,
    @Inject(STORAGE_BUCKET_KEY) private readonly storage_bucket: string,
    @Inject(STORAGE_ENDPOINT_KEY) private readonly storage_endpoint: string,
  ) {}

  async put_object(input: {
    key: string;
    body: Buffer;
    content_type: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.storage_bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.content_type,
      }),
    );
  }

  async check_bucket_access(): Promise<void> {
    await this.client.send(
      new HeadBucketCommand({
        Bucket: this.storage_bucket,
      }),
    );
  }

  /**
   * Unsigned path-style GET — requires world-readable objects (see README bucket policy).
   * Writes still use `put_object` with credentials.
   */
  async get_object(key: string): Promise<Buffer> {
    const url = path_style_object_url(
      this.storage_endpoint,
      this.storage_bucket,
      key,
    );

    const response = await fetch(url);

    if (response.status === 404) {
      throw new Error(`S3 object not found: ${key}`);
    }

    if (!response.ok) {
      throw new Error(
        `S3 GET failed (${response.status}) for ${key}: ${response.statusText}`,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }
}

/** Path-style URL for anonymous GET (MinIO, path-style S3). */
function path_style_object_url(
  endpoint: string,
  bucket: string,
  key: string,
): string {
  const base = endpoint.replace(/\/$/, '');
  const encoded_key = key.split('/').map(encodeURIComponent).join('/');

  return `${base}/${encodeURIComponent(bucket)}/${encoded_key}`;
}
