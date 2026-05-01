import { customType } from 'drizzle-orm/pg-core';

import { sha256_prefix, type Sha256Hash } from '@gutenberg/core';

export const sha256_hash = customType<{
  data: Sha256Hash;
  driverData: Buffer;
}>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Sha256Hash): Buffer {
    const hex = value.startsWith(sha256_prefix)
      ? value.slice(sha256_prefix.length)
      : value;

    if (hex.length !== 64) {
      throw new Error('sha256 hash must be 64 hex characters');
    }

    return Buffer.from(hex, 'hex');
  },
  fromDriver(value: unknown): Sha256Hash {
    if (Buffer.isBuffer(value)) {
      return `${sha256_prefix}${value.toString('hex')}`;
    }

    if (
      value &&
      typeof value === 'object' &&
      'buffer' in value &&
      'byteOffset' in value &&
      'byteLength' in value
    ) {
      const view = value as ArrayBufferView;
      return `${sha256_prefix}${Buffer.from(
        view.buffer,
        view.byteOffset,
        view.byteLength,
      ).toString('hex')}`;
    }

    if (typeof value === 'string') {
      const hex = value.startsWith('\\x') ? value.slice(2) : value;
      if (hex.length === 64 && /^[0-9a-f]+$/i.test(hex)) {
        return `${sha256_prefix}${hex.toLowerCase()}`;
      }
    }

    throw new Error('Unexpected sha256_hash driver value');
  },
});
