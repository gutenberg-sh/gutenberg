import { Injectable } from '@nestjs/common';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

import type { GutenbergManifest } from '../../common/types/manifest.types';

import { MarkdownRenderService } from './markdown-render.service';

export type LocalSiteGatewayInput = {
  host: string;
  port: number;
  name: string;
  version: string;
  manifest: GutenbergManifest;
  files: Record<`/${string}`, Buffer>;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

@Injectable()
export class LocalSiteGatewayService {
  constructor(private readonly markdown_render: MarkdownRenderService) {}

  async listen(
    input: LocalSiteGatewayInput,
  ): Promise<{ url: string; close: () => Promise<void> }> {
    const prefix = `/${encodeURIComponent(input.name)}/${encodeURIComponent(input.version)}`;
    const server = createServer((req, res) => {
      this.handle_request(req, res, input, prefix);
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(input.port, input.host, () => resolve());
      server.once('error', reject);
    });

    const url = `http://${input.host}:${input.port}${prefix}/`;

    return {
      url,
      close: () =>
        new Promise((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        }),
    };
  }

  private handle_request(
    req: IncomingMessage,
    res: ServerResponse,
    input: LocalSiteGatewayInput,
    prefix: string,
  ): void {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
      }

      const host = req.headers.host ?? `${input.host}:${input.port}`;
      const origin = new URL(`http://${host}`).origin;
      const pathname = decodeURIComponent(
        new URL(req.url ?? '/', `http://${host}`).pathname,
      );

      if (pathname === '/' || pathname === '') {
        res.writeHead(302, { Location: `${prefix}/` });
        res.end();
        return;
      }

      if (!pathname.startsWith(prefix)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const remainder = pathname.slice(prefix.length);
      const site_path = resolve_site_path(remainder, input.manifest.entry);

      if (!site_path || !(site_path in input.files)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const buffer = input.files[site_path];

      if (!buffer) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const ext = site_path.slice(site_path.lastIndexOf('.')).toLowerCase();

      if (ext === '.md') {
        const body = this.render_md_page({
          origin,
          prefix,
          site_path,
          manifest: input.manifest,
          markdown: buffer.toString('utf8'),
        });

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy':
            "default-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data: https: http:; style-src 'unsafe-inline'; script-src 'none'",
        });

        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        res.end(body);
        return;
      }

      res.writeHead(200, {
        'Content-Type': MIME_BY_EXTENSION[ext] ?? 'application/octet-stream',
        'Content-Security-Policy':
          "default-src 'none'; script-src 'none'; style-src 'none'",
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      res.end(buffer);
    } catch {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }

      res.end('Internal error');
    }
  }

  private render_md_page(options: {
    origin: string;
    prefix: string;
    site_path: `/${string}`;
    manifest: GutenbergManifest;
    markdown: string;
  }): string {
    const html_body = this.markdown_render.render_markdown_fragment(
      options.markdown,
    );
    const dirname = posix_dirname(options.site_path);
    const base_path =
      dirname === '' ? `${options.prefix}/` : `${options.prefix}${dirname}/`;
    const base_href = `${options.origin}${base_path}`;
    const nav_links = (Object.keys(options.manifest.files) as `/${string}`[])
      .filter((p) => p.endsWith('.md'))
      .sort()
      .map((p) => {
        const label = p === '/' ? 'root' : p.slice(1);
        const href = `${options.origin}${options.prefix}${encodeURI(p)}`;
        const active = p === options.site_path ? ' aria-current="page"' : '';

        return `<li><a href="${escape_html(href)}"${active}>${escape_html(label)}</a></li>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape_html(options.manifest.name)} ${escape_html(options.manifest.version)} — ${escape_html(options.site_path)}</title>
<base href="${escape_html(base_href)}">
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 0 1rem 2rem; max-width: 52rem; margin-left: auto; margin-right: auto; }
header { padding: 1rem 0; border-bottom: 1px solid #ccc; margin-bottom: 1.25rem; }
nav ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
nav a { text-decoration: none; }
nav a:hover { text-decoration: underline; }
main :where(h1, h2, h3, h4) { line-height: 1.25; }
main pre { overflow: auto; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #ccc; }
main code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.92em; }
main img { max-width: 100%; height: auto; }
main table { border-collapse: collapse; width: 100%; }
main th, main td { border: 1px solid #ccc; padding: 0.35rem 0.5rem; }
@media (prefers-color-scheme: dark) {
  body { background: #0f0f12; color: #e8e6e3; }
  header { border-color: #333; }
  nav a { color: #9ecbff; }
  main pre, main th, main td { border-color: #444; background: #16161c; }
}
</style>
</head>
<body>
<header>
<p style="margin:0 0 0.5rem;font-size:0.85rem;opacity:0.85">Verified release · ${escape_html(options.manifest.name)}@${escape_html(options.manifest.version)}</p>
<nav aria-label="Pages"><ul>${nav_links}</ul></nav>
</header>
<main>${html_body}</main>
</body>
</html>`;
  }
}

function resolve_site_path(
  remainder: string,
  entry: `/${string}`,
): `/${string}` | undefined {
  const trimmed = remainder.replace(/\/{2,}/g, '/');

  if (trimmed === '' || trimmed === '/') {
    return entry;
  }

  const without_leading = trimmed.replace(/^\/+/, '');

  if (without_leading.includes('..') || without_leading.includes('\0')) {
    return undefined;
  }

  return `/${without_leading}`;
}

function posix_dirname(site_path: `/${string}`): string {
  const idx = site_path.lastIndexOf('/');

  if (idx <= 0) {
    return '';
  }

  return site_path.slice(0, idx);
}

function escape_html(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
