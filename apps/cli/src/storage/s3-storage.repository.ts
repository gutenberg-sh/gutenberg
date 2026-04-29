import {
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';

import { STORAGE_BUCKET_KEY } from '../config/config.symbols';

@Injectable()
export class S3StorageRepository {
  constructor(
    private readonly client: S3Client,
    @Inject(STORAGE_BUCKET_KEY) private readonly storageBucket: string,
  ) {}

  async put_object(input: {
    key: string;
    body: Buffer;
    content_type: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.storageBucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.content_type,
      }),
    );
  }

  async check_bucket_access(): Promise<void> {
    await this.client.send(
      new HeadBucketCommand({
        Bucket: this.storageBucket,
      }),
    );
  }

  async get_object(key: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.storageBucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`S3 object has no body: ${key}`);
      }

      return stream_to_buffer(response.Body as Readable);
    } catch (error) {
      if (error instanceof NoSuchKey) {
        throw new Error(`S3 object not found: ${key}`, { cause: error });
      }

      throw error;
    }
  }
}

async function stream_to_buffer(stream: Readable): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
