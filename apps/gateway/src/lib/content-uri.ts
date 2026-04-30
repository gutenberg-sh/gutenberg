import type { ContentUri } from './types';

const ARWEAVE_LIKE_TX_ID = /^[A-Za-z0-9_-]{32,128}$/;

export function is_content_uri(uri: unknown): uri is ContentUri {
  if (typeof uri !== 'string' || !uri.startsWith('ar://')) {
    return false;
  }

  return ARWEAVE_LIKE_TX_ID.test(uri.slice('ar://'.length));
}

export function tx_id_from_content_uri(uri: ContentUri): string {
  return uri.slice('ar://'.length);
}
