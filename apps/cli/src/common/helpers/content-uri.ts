const ARWEAVE_LIKE_TX_ID = /^[A-Za-z0-9_-]{32,128}$/;

export function is_content_uri(uri: string): uri is `ar://${string}` {
  if (!uri.startsWith('ar://')) {
    return false;
  }

  const tx_id = uri.slice('ar://'.length);

  return ARWEAVE_LIKE_TX_ID.test(tx_id);
}

export function tx_id_from_content_uri(uri: `ar://${string}`): string {
  return uri.slice('ar://'.length);
}

export function content_uri_from_tx_id(tx_id: string): `ar://${string}` {
  if (!ARWEAVE_LIKE_TX_ID.test(tx_id)) {
    throw new Error(`Invalid Arweave tx id: ${tx_id}`);
  }

  return `ar://${tx_id}`;
}
