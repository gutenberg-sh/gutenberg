import { is_content_uri, tx_id_from_content_uri } from './content-uri';

const GATEWAY_FETCH_TIMEOUT_MS = 8_000;

export function resolve_content_url(uri: string, gateway: string): string {
  if (is_content_uri(uri)) {
    const tx_id = tx_id_from_content_uri(uri);
    const base = gateway.replace(/\/$/, '');

    return `${base}/${encodeURIComponent(tx_id)}`;
  }

  return uri;
}

export function resolve_content_urls(
  uri: string,
  gateways: readonly string[],
): readonly { gateway: string; url: string }[] {
  if (!is_content_uri(uri) || gateways.length === 0) {
    return [];
  }

  return gateways.map((gateway) => ({
    gateway,
    url: resolve_content_url(uri, gateway),
  }));
}

export type GatewayValidation = true | string;

export type GatewayValidator = (
  bytes: Uint8Array,
) => Promise<GatewayValidation> | GatewayValidation;

export async function fetch_blob(
  uri: string,
  arweave_gateways: readonly string[],
  validate?: GatewayValidator,
): Promise<Uint8Array> {
  if (!is_content_uri(uri)) {
    return fetch_one(uri);
  }

  if (arweave_gateways.length === 0) {
    throw new Error('No Arweave gateways configured');
  }

  const errors: string[] = [];

  for (const gateway of arweave_gateways) {
    const url = resolve_content_url(uri, gateway);

    try {
      const bytes = await fetch_one(url);

      if (validate) {
        const verdict = await validate(bytes);

        if (verdict !== true) {
          errors.push(`${safe_host(gateway)}: ${verdict}`);
          continue;
        }
      }

      return bytes;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${safe_host(gateway)}: ${message}`);
    }
  }

  throw new Error(
    `Failed to fetch ${uri} from all ${arweave_gateways.length} gateways:\n  - ${errors.join('\n  - ')}`,
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
