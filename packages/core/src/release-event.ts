import { base58_encode } from './base58.js';
import { bytes_equal, bytes_to_hex, sha256 } from './hash.js';
import {
  release_event_type,
  sha256_prefix,
  type ContentUri,
  type GutenbergReleaseEvent,
  type Sha256Hash,
} from './types.js';

const PROGRAM_DATA_PREFIX = 'Program data: ';

export const EVENT_DISCRIMINATOR = {
  ReleasePublished: anchor_event_discriminator('ReleasePublished'),
} as const;

export type DecodedReleaseEvent = GutenbergReleaseEvent & {
  release_address: string;
  publication_address: string;
};

export function decode_release_event_payload(
  data: Uint8Array,
): DecodedReleaseEvent {
  if (data.byteLength < 8) {
    throw new Error('Release event payload is truncated');
  }

  const discriminator = data.subarray(0, 8);

  if (!bytes_equal(discriminator, EVENT_DISCRIMINATOR.ReleasePublished)) {
    throw new Error('Invalid Anchor event discriminator');
  }

  const reader = new EventReader(data, 8);
  const publisher_bytes = reader.read_bytes(32);
  const release_bytes = reader.read_bytes(32);
  const publication_bytes = reader.read_bytes(32);
  const schema_version = reader.read_u8();
  const registry_id = reader.read_string();
  const version = reader.read_string();
  const manifest_uri = reader.read_string();
  const manifest_hash_raw = reader.read_bytes(32);
  const content_hash_raw = reader.read_bytes(32);
  const content_size_bytes = Number(reader.read_u64_le());
  const published_at_unix = Number(reader.read_i64_le());
  // published_at_slot is also emitted but the public type only carries
  // a single timestamp; we read past it to keep the cursor aligned.
  reader.read_u64_le();

  return {
    type: release_event_type,
    schema_version,
    publisher: base58_encode(publisher_bytes),
    registry_id,
    version,
    manifest: manifest_uri as ContentUri,
    manifest_hash: prefixed_sha256(manifest_hash_raw),
    content_hash: prefixed_sha256(content_hash_raw),
    content_size_bytes,
    published_at: new Date(published_at_unix * 1000).toISOString(),
    release_address: base58_encode(release_bytes),
    publication_address: base58_encode(publication_bytes),
  };
}

/**
 * Extract `Program data: <base64>` lines from a transaction's log array,
 * decode them, and yield any that look like a `ReleasePublished` event for
 * the configured Gutenberg registry program. Lines that don't match are
 * silently skipped; Anchor mixes our events with `Program log:` traces
 * and other programs' data lines.
 */
export function decode_release_events_from_logs(
  logs: readonly string[],
): DecodedReleaseEvent[] {
  const events: DecodedReleaseEvent[] = [];

  for (const line of logs) {
    if (!line.startsWith(PROGRAM_DATA_PREFIX)) {
      continue;
    }

    const encoded = line.slice(PROGRAM_DATA_PREFIX.length).trim();

    let payload: Uint8Array;

    try {
      payload = base64_decode(encoded);
    } catch {
      continue;
    }

    if (payload.byteLength < 8) {
      continue;
    }

    if (
      !bytes_equal(payload.subarray(0, 8), EVENT_DISCRIMINATOR.ReleasePublished)
    ) {
      continue;
    }

    try {
      events.push(decode_release_event_payload(payload));
    } catch {
      continue;
    }
  }

  return events;
}

function anchor_event_discriminator(event_name: string): Uint8Array {
  return sha256(new TextEncoder().encode(`event:${event_name}`)).subarray(0, 8);
}

function prefixed_sha256(bytes: Uint8Array): Sha256Hash {
  return `${sha256_prefix}${bytes_to_hex(bytes)}`;
}

class EventReader {
  private offset: number;
  private readonly data: Uint8Array;

  constructor(data: Uint8Array, start: number) {
    this.data = data;
    this.offset = start;
  }

  read_bytes(length: number): Uint8Array {
    const next = this.offset + length;

    if (next > this.data.byteLength) {
      throw new Error('Release event payload is truncated');
    }

    const value = this.data.subarray(this.offset, next);
    this.offset = next;

    return value;
  }

  read_u8(): number {
    const bytes = this.read_bytes(1);

    if (bytes.length === 0) {
      throw new Error('read_u8: out of range');
    }

    return bytes[0]!;
  }

  read_string(): string {
    const length_bytes = this.read_bytes(4);
    const length = new DataView(
      length_bytes.buffer,
      length_bytes.byteOffset,
      4,
    ).getUint32(0, true);

    return new TextDecoder('utf-8').decode(this.read_bytes(length));
  }

  read_i64_le(): bigint {
    const bytes = this.read_bytes(8);

    return new DataView(bytes.buffer, bytes.byteOffset, 8).getBigInt64(0, true);
  }

  read_u64_le(): bigint {
    const bytes = this.read_bytes(8);

    return new DataView(bytes.buffer, bytes.byteOffset, 8).getBigUint64(
      0,
      true,
    );
  }
}

function base64_decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
