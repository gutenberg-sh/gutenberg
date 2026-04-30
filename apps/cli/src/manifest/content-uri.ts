/**
 * Settled Arweave txs use 43 url-safe base64 characters; Irys may surface the same
 * or other opaque ids (length/alphabet) in the receipt before/after settlement.
 */
const ARWEAVE_LIKE_TX_ID = /^[A-Za-z0-9+/=_-]{32,128}$/;

/** True when the path ends with `/ipfs/{cid}` (legacy IPFS gateways). */
function is_ipfs_path_gateway(u: URL): boolean {
  const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
  const cid = parts[1];

  return (
    parts.length >= 2 &&
    parts[0] === 'ipfs' &&
    cid !== undefined &&
    cid.length > 0
  );
}

/** True when the last path segment looks like an Arweave / bundler transaction id. */
function is_arweave_tx_path(u: URL): boolean {
  const segments = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
  const raw = segments[segments.length - 1];

  if (raw === undefined || raw.length === 0) {
    return false;
  }

  let last: string;

  try {
    last = decodeURIComponent(raw);
  } catch {
    last = raw;
  }

  return ARWEAVE_LIKE_TX_ID.test(last);
}

/**
 * Manifest/bundle URIs are HTTPS (or HTTP for localhost) URLs that resolve to immutable content:
 * IPFS path gateways (`…/ipfs/{cid}`) or Arweave/Irys settlement URLs (`…/{tx id}`).
 */
export function is_content_uri(uri: string): boolean {
  try {
    const u = new URL(uri.trim());

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }

    return is_ipfs_path_gateway(u) || is_arweave_tx_path(u);
  } catch {
    return false;
  }
}
