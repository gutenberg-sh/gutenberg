const ARWEAVE_LIKE_TX_ID = /^[A-Za-z0-9+/=_-]{32,128}$/;

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

export function is_content_uri(uri: string): boolean {
  try {
    const u = new URL(uri.trim());

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }

    return is_arweave_tx_path(u);
  } catch {
    return false;
  }
}
