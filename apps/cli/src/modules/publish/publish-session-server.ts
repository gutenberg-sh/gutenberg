import { randomBytes } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { URL } from 'node:url';

import {
  PUBLISH_SESSION_PROTOCOL_VERSION,
  type PublishSessionError,
  type PublishSessionInput,
  type PublishSessionProgress,
  type PublishSessionResult,
} from '@gutenberg/core';

const ALLOWED_PATHS = new Set([
  '/session/manifest-input',
  '/session/result',
  '/session/cancel',
  '/session/progress',
]);

export type PublishOutcome =
  | { kind: 'success'; result: PublishSessionResult }
  | { kind: 'failed'; message: string }
  | { kind: 'cancelled'; message: string };

export type PublishProgressListener = (
  progress: PublishSessionProgress,
) => void;

export type PublishSessionServerHandle = {
  port: number;
  token: string;
  url: string;
  wait_for_outcome(timeout_ms: number): Promise<PublishOutcome>;
  close(): Promise<void>;
};

export async function start_publish_session_server(input: {
  session: PublishSessionInput;
  allowed_origin: string;
  on_progress?: PublishProgressListener;
}): Promise<PublishSessionServerHandle> {
  const token = randomBytes(24).toString('hex');
  const allowed_origin = input.allowed_origin.replace(/\/$/, '');

  let outcome_resolve: ((outcome: PublishOutcome) => void) | undefined;
  const outcome_promise = new Promise<PublishOutcome>((resolve) => {
    outcome_resolve = resolve;
  });

  const server = createServer((req, res) => {
    handle_request({
      req,
      res,
      session: input.session,
      token,
      allowed_origin,
      on_progress: input.on_progress,
      resolve_outcome: (outcome) => outcome_resolve?.(outcome),
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);

      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(message);
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Local publish session server did not bind to a port');
  }

  return {
    port: address.port,
    token,
    url: `http://127.0.0.1:${address.port}`,
    wait_for_outcome: async (timeout_ms) =>
      Promise.race([
        outcome_promise,
        new Promise<PublishOutcome>((resolve) => {
          setTimeout(
            () =>
              resolve({
                kind: 'failed',
                message: `Browser did not return a result within ${Math.round(timeout_ms / 1000)}s`,
              }),
            timeout_ms,
          );
        }),
      ]),
    close: () => close_server(server),
  };
}

async function handle_request(input: {
  req: IncomingMessage;
  res: ServerResponse;
  session: PublishSessionInput;
  token: string;
  allowed_origin: string;
  on_progress: PublishProgressListener | undefined;
  resolve_outcome: (outcome: PublishOutcome) => void;
}): Promise<void> {
  const { req, res } = input;
  const origin = req.headers.origin;

  if (origin && origin !== input.allowed_origin) {
    if (!is_local_origin(origin)) {
      res.statusCode = 403;
      res.end('forbidden origin');
      return;
    }
  }

  set_cors_headers(res, origin ?? input.allowed_origin);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!req.url) {
    res.statusCode = 400;
    res.end('missing url');
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1`);

  if (!ALLOWED_PATHS.has(url.pathname)) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }

  if (url.searchParams.get('session') !== input.token) {
    res.statusCode = 401;
    res.end('invalid session token');
    return;
  }

  if (url.pathname === '/session/manifest-input' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(input.session));
    return;
  }

  if (req.method === 'POST') {
    const body = await read_json_body(req);

    if (url.pathname === '/session/result') {
      const parsed = parse_result(body);
      input.resolve_outcome({ kind: 'success', result: parsed });
      res.statusCode = 200;
      res.end('{}');
      return;
    }

    if (url.pathname === '/session/cancel') {
      const parsed = parse_error(body);
      input.resolve_outcome({
        kind: parsed.kind,
        message: parsed.message,
      });
      res.statusCode = 200;
      res.end('{}');
      return;
    }

    if (url.pathname === '/session/progress') {
      try {
        const parsed = parse_progress(body);
        input.on_progress?.(parsed);
      } catch {
        // ignore malformed progress
      }
      res.statusCode = 200;
      res.end('{}');
      return;
    }
  }

  res.statusCode = 405;
  res.end('method not allowed');
}

function set_cors_headers(res: ServerResponse, origin: string): void {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function is_local_origin(origin: string): boolean {
  try {
    const url = new URL(origin);

    return (
      url.hostname === '127.0.0.1' ||
      url.hostname === 'localhost' ||
      url.hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

async function read_json_body(req: IncomingMessage): Promise<unknown> {
  let total = 0;
  const max_bytes = 4 * 1024 * 1024;
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as Uint8Array);
    total += buffer.byteLength;

    if (total > max_bytes) {
      throw new Error('Request body exceeds 4 MB');
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const text = Buffer.concat(chunks).toString('utf8');

  return JSON.parse(text);
}

function parse_result(body: unknown): PublishSessionResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('result body must be an object');
  }

  const v = body as Record<string, unknown>;

  if (v.protocol_version !== PUBLISH_SESSION_PROTOCOL_VERSION) {
    throw new Error('protocol version mismatch');
  }

  return v as unknown as PublishSessionResult;
}

function parse_error(body: unknown): PublishSessionError {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      protocol_version: PUBLISH_SESSION_PROTOCOL_VERSION,
      kind: 'cancelled',
      message: 'cancelled',
    };
  }

  const v = body as Record<string, unknown>;
  const kind: PublishSessionError['kind'] =
    v.kind === 'failed' ? 'failed' : 'cancelled';
  const message = typeof v.message === 'string' ? v.message : 'cancelled';

  return {
    protocol_version: PUBLISH_SESSION_PROTOCOL_VERSION,
    kind,
    message,
  };
}

function parse_progress(body: unknown): PublishSessionProgress {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('progress body must be an object');
  }

  const v = body as Record<string, unknown>;

  if (v.protocol_version !== PUBLISH_SESSION_PROTOCOL_VERSION) {
    throw new Error('protocol version mismatch');
  }

  if (typeof v.kind !== 'string' || typeof v.message !== 'string') {
    throw new Error('progress is missing kind or message');
  }

  return v as unknown as PublishSessionProgress;
}

async function close_server(server: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  });
}
