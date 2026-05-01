import {
  PUBLISH_SESSION_PROTOCOL_VERSION,
  type PublishSessionError,
  type PublishSessionInput,
  type PublishSessionProgress,
  type PublishSessionResult,
} from '@gutenberg/core';

export type SessionConfig = {
  port: number;
  token: string;
};

export function read_session_config_from_url(
  url: URL,
): SessionConfig | undefined {
  const port_raw = url.searchParams.get('port');
  const token = url.searchParams.get('session');

  if (!port_raw || !token) {
    return undefined;
  }

  const port = Number.parseInt(port_raw, 10);

  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    return undefined;
  }

  return { port, token };
}

function endpoint(cfg: SessionConfig, path: string): string {
  return `http://127.0.0.1:${cfg.port}${path}?session=${encodeURIComponent(cfg.token)}`;
}

export async function fetch_session_input(
  cfg: SessionConfig,
): Promise<PublishSessionInput> {
  const response = await fetch(endpoint(cfg, '/session/manifest-input'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Could not load publish session (HTTP ${response.status}). Run \`gutenberg publish\` again from your terminal.`,
    );
  }

  const body = (await response.json()) as PublishSessionInput;
  const expected: number = PUBLISH_SESSION_PROTOCOL_VERSION;
  const got = (body as { protocol_version: number }).protocol_version;

  if (got !== expected) {
    throw new Error(
      `Publish session protocol mismatch (gateway expects v${expected}, got v${got}). Update the CLI or gateway.`,
    );
  }

  return body;
}

export async function post_session_progress(
  cfg: SessionConfig,
  progress: Omit<PublishSessionProgress, 'protocol_version'>,
): Promise<void> {
  await safe_post(endpoint(cfg, '/session/progress'), {
    protocol_version: PUBLISH_SESSION_PROTOCOL_VERSION,
    ...progress,
  });
}

export async function post_session_result(
  cfg: SessionConfig,
  result: Omit<PublishSessionResult, 'protocol_version'>,
): Promise<void> {
  await must_post(endpoint(cfg, '/session/result'), {
    protocol_version: PUBLISH_SESSION_PROTOCOL_VERSION,
    ...result,
  });
}

export async function post_session_error(
  cfg: SessionConfig,
  error: Omit<PublishSessionError, 'protocol_version'>,
): Promise<void> {
  await safe_post(endpoint(cfg, '/session/cancel'), {
    protocol_version: PUBLISH_SESSION_PROTOCOL_VERSION,
    ...error,
  });
}

async function must_post(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to deliver result to CLI (HTTP ${response.status})`,
    );
  }
}

async function safe_post(url: string, body: unknown): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // best-effort
  }
}
