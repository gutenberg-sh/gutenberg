const ARWEAVE_TX_ID_PATTERN = /^[A-Za-z0-9+/=_-]{32,128}$/;

export async function fetch_blob(
  uri: string,
  arweave_gateway: string,
): Promise<Uint8Array> {
  const resolved = resolve_arweave_fetch_url(uri, arweave_gateway);
  const response = await fetch(resolved, {
    redirect: 'follow',
    headers: {
      Accept: 'application/octet-stream,application/json;q=0.9,*/*;q=0.8',
    },
  });

  if (response.status === 404) {
    throw new Error(`Content not found: ${resolved}`);
  }

  if (!response.ok) {
    throw new Error(
      `GET failed (${response.status}) for ${resolved}: ${response.statusText}`,
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

/**
 * If the manifest references an arweave.net URL but the user prefers a
 * specific gateway (e.g. `gateway.irys.xyz`), rewrite to that gateway. This
 * mirrors the CLI's behavior for consistent caching and CORS behavior.
 */
export function resolve_arweave_fetch_url(
  url: string,
  gateway: string,
): string {
  let parsed: URL;

  try {
    parsed = new URL(url.trim());
  } catch {
    return url;
  }

  const host = parsed.hostname.toLowerCase();

  if (host !== 'arweave.net' && host !== 'www.arweave.net') {
    return url;
  }

  const segments = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');

  if (segments.length === 0) {
    return url;
  }

  const raw_segment = segments[segments.length - 1];

  if (raw_segment === undefined || raw_segment.length === 0) {
    return url;
  }

  let last: string;

  try {
    last = decodeURIComponent(raw_segment);
  } catch {
    last = raw_segment;
  }

  if (!ARWEAVE_TX_ID_PATTERN.test(last)) {
    return url;
  }

  const base = gateway.replace(/\/$/, '');

  return `${base}/${encodeURIComponent(last)}`;
}
