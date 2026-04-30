import { Injectable } from '@nestjs/common';

import type { ContentUri } from '../manifest/manifest.types';

import { IrysStorageRepository } from './irys-storage.repository';
import type { ContentStore } from './storage.types';

@Injectable()
export class StorageService implements ContentStore {
  constructor(private readonly irysStorageRepository: IrysStorageRepository) {}

  async put_blob(data: Buffer | string): Promise<ContentUri> {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);

    return this.irysStorageRepository.add_bytes(bytes, 'bundle.tar');
  }

  async put_manifest(data: Buffer | string): Promise<ContentUri> {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);

    return this.irysStorageRepository.add_bytes(bytes, 'manifest.json');
  }

  async get_blob(uri: ContentUri): Promise<Buffer> {
    return this.irysStorageRepository.get(uri);
  }
}
