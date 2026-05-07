import { Download } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { format_bytes } from '@/lib/format';
import { cn } from '@/lib/utils';

const TEXT_EXTS = new Set([
  '.txt',
  '.json',
  '.css',
  '.html',
  '.svg',
  '.md',
  '.csv',
  '.yml',
  '.yaml',
  '.xml',
  '.toml',
]);

const IMAGE_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
]);

export function AssetView({
  path,
  bytes,
}: {
  path: `/${string}`;
  bytes: Uint8Array;
}) {
  const ext = useMemo(() => {
    const idx = path.lastIndexOf('.');

    return idx >= 0 ? path.slice(idx).toLowerCase() : '';
  }, [path]);

  const mime = useMemo(() => mime_for_ext(ext), [ext]);

  const blob_url = useMemo(() => {
    const blob = new Blob(
      [
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      ],
      { type: mime },
    );

    return URL.createObjectURL(blob);
  }, [bytes, mime]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(blob_url);
    };
  }, [blob_url]);

  const filename = path.slice(path.lastIndexOf('/') + 1);

  if (IMAGE_EXTS.has(ext)) {
    return (
      <figure className="grid gap-3">
        <img
          src={blob_url}
          alt={path}
          className="max-h-[72vh] w-full rounded-lg border border-border bg-muted/30 object-contain"
        />
      </figure>
    );
  }

  if (TEXT_EXTS.has(ext)) {
    let text: string;

    try {
      text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      text = '<binary>';
    }

    return (
      <div className="grid gap-3">
        <pre
          className={cn(
            'max-h-[72vh] overflow-auto rounded-lg border border-border bg-muted/40 p-4',
            'font-mono text-[12.5px] leading-[1.65] tabular',
          )}
        >
          <code>{text}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="grid gap-5 border-y border-border/70 py-10 text-center">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Binary asset
      </p>
      <p className="font-mono text-[13.5px] tabular text-foreground">{path}</p>
      <p className="font-mono text-[12px] tabular text-muted-foreground">
        {format_bytes(bytes.byteLength)}
      </p>
      <div>
        <a
          href={blob_url}
          download={filename}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong active:translate-y-px"
        >
          <Download className="size-3.5" strokeWidth={1.85} aria-hidden />
          Download
        </a>
      </div>
    </div>
  );
}

function mime_for_ext(ext: string): string {
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.json':
      return 'application/json';
    case '.css':
      return 'text/css';
    case '.html':
      return 'text/html';
    case '.txt':
    case '.md':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}
