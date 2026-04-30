import { Download, FileText, ImageIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { Button } from '@/components/ui/button';

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
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
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
      <figure className="grid gap-2">
        <img
          src={blob_url}
          alt={path}
          className="max-h-[70vh] rounded-lg border bg-muted/50 object-contain"
        />
        <figcaption className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5" aria-hidden />
          <code className="font-mono">{path}</code>
          <span>· {format_bytes(bytes.byteLength)}</span>
        </figcaption>
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
      <div className="grid gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5" aria-hidden />
          <code className="font-mono">{path}</code>
          <span>· {format_bytes(bytes.byteLength)}</span>
        </div>
        <pre className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/50 p-4 text-xs">
          <code>{text}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Binary asset at <code className="font-mono">{path}</code> (
        {format_bytes(bytes.byteLength)})
      </p>
      <Button asChild variant="outline" className="justify-self-center">
        <a href={blob_url} download={filename}>
          <Download className="size-4" aria-hidden />
          Download
        </a>
      </Button>
    </div>
  );
}

function format_bytes(byte_count: number): string {
  if (byte_count < 1024) {
    return `${byte_count} B`;
  }

  if (byte_count < 1024 * 1024) {
    return `${(byte_count / 1024).toFixed(1)} KB`;
  }

  return `${(byte_count / 1024 / 1024).toFixed(2)} MB`;
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
