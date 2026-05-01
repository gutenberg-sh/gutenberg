import { is_content_uri, tx_id_from_content_uri } from './content-uri.js';

const GATEWAY_FETCH_TIMEOUT_MS = 8_000;

export type GatewayKind = 'canonical' | 'mirror';

export type GatewayEntry = {
  kind: GatewayKind;
  url: string;
};

export type ResolvedGatewayLink = {
  kind: GatewayKind;
  gateway: string;
  url: string;
};

export function resolve_content_url(uri: string, gateway: string): string {
  if (is_content_uri(uri)) {
    const tx_id = tx_id_from_content_uri(uri);
    const base = gateway.replace(/\/$/, '');

    return `${base}/${encodeURIComponent(tx_id)}`;
  }

  return uri;
}

export function build_gateway_entries(
  irys_gateway: string,
  arweave_mirrors: readonly string[],
): readonly GatewayEntry[] {
  const seen = new Set<string>();
  const out: GatewayEntry[] = [];

  const canonical = irys_gateway.replace(/\/$/, '');
  out.push({ kind: 'canonical', url: canonical });
  seen.add(canonical);

  for (const m of arweave_mirrors) {
    const trimmed = m.replace(/\/$/, '');

    if (seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    out.push({ kind: 'mirror', url: trimmed });
  }

  return out;
}

export function resolve_content_links(
  uri: string,
  irys_gateway: string,
  arweave_mirrors: readonly string[],
): readonly ResolvedGatewayLink[] {
  if (!is_content_uri(uri)) {
    return [];
  }

  return build_gateway_entries(irys_gateway, arweave_mirrors).map((entry) => ({
    kind: entry.kind,
    gateway: entry.url,
    url: resolve_content_url(uri, entry.url),
  }));
}

export type GatewayValidation = true | string;

export type GatewayValidator = (
  bytes: Uint8Array,
) => Promise<GatewayValidation> | GatewayValidation;

export async function fetch_blob(
  uri: string,
  irys_gateway: string,
  arweave_mirrors: readonly string[],
  validate?: GatewayValidator,
): Promise<Uint8Array> {
  if (!is_content_uri(uri)) {
    return fetch_one(uri);
  }

  const ordered = build_gateway_entries(irys_gateway, arweave_mirrors);
  const errors: string[] = [];

  for (const entry of ordered) {
    const url = resolve_content_url(uri, entry.url);

    try {
      const bytes = await fetch_one(url);

      if (validate) {
        const verdict = await validate(bytes);

        if (verdict !== true) {
          errors.push(`${safe_host(entry.url)} (${entry.kind}): ${verdict}`);
          continue;
        }
      }

      return bytes;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${safe_host(entry.url)} (${entry.kind}): ${message}`);
    }
  }

  throw new Error(
    `Failed to fetch ${uri} from canonical Irys + ${arweave_mirrors.length} mirror(s):\n  - ${errors.join('\n  - ')}`,
  );
}

async function fetch_one(url: string): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GATEWAY_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'application/octet-stream,application/json;q=0.9,*/*;q=0.8',
      },
    });

    if (response.status === 404) {
      throw new Error(`404 not found at ${url}`);
    }

    if (!response.ok) {
      throw new Error(
        `GET failed (${response.status} ${response.statusText}) at ${url}`,
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('aborted'))
    ) {
      throw new Error(`timeout after ${GATEWAY_FETCH_TIMEOUT_MS}ms`, {
        cause: error,
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function safe_host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
