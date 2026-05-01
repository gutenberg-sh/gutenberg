import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Fingerprint,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { GatewayLinks } from '@/components/GatewayLinks';
import { env } from '@/env';
import { explorer_address_url } from '@/lib/explorer';
import type { VerifiedRelease } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ReleaseHeader({ release }: { release: VerifiedRelease }) {
  const manifest = release.manifest;
  const file_count = Object.keys(manifest.files).length;
  const sub_meta = [
    `${file_count} file${file_count === 1 ? '' : 's'}`,
    format_bytes(manifest.content_size_bytes),
    manifest.license,
    manifest.language,
  ].filter((v): v is string => Boolean(v));

  return (
    <section aria-label="Release" className="grid gap-5">
      <IdentityStrip
        publisher={manifest.publisher}
        published_at={manifest.published_at}
      />

      <h1 className="text-balance font-semibold tracking-[-0.02em] text-foreground">
        <Link
          to={`/r/${encodeURIComponent(manifest.name)}`}
          className="text-[1.75rem] leading-[1.1] hover:underline sm:text-[2.125rem] lg:text-[2.5rem]"
          title="Open the latest version"
        >
          {manifest.name}
        </Link>
        <span className="ml-3 align-baseline font-mono text-[1rem] font-normal tabular text-foreground-soft sm:text-[1.125rem] lg:text-[1.25rem]">
          {manifest.version}
        </span>
        <Link
          to={`/r/${encodeURIComponent(manifest.name)}/versions`}
          className="ml-3 inline-flex items-center gap-1 align-middle text-[11.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          title="View all versions"
        >
          <GitBranch className="size-3" strokeWidth={1.85} aria-hidden />
          versions
        </Link>
      </h1>

      {sub_meta.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-foreground-soft">
          {sub_meta.map((value, idx) => (
            <span key={value} className="inline-flex items-center gap-2">
              {idx > 0 ? <Dot /> : null}
              <span>{value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {manifest.tags && manifest.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {manifest.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2 py-0.5 font-mono text-[10.5px] tabular text-foreground-soft"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <ProvenanceDisclosure release={release} />
    </section>
  );
}

function IdentityStrip({
  publisher,
  published_at,
}: {
  publisher: string;
  published_at: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        icon={<Calendar className="size-3" strokeWidth={1.85} aria-hidden />}
      >
        {format_date(published_at)}
      </Chip>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <Chip
          variant="accent"
          title="Verified in your browser — author signature, manifest hash, and content hash all match the chain."
          icon={<ShieldCheck className="size-3" strokeWidth={1.85} aria-hidden />}
        >
          Verified
        </Chip>

        <span className="inline-flex items-center gap-1">
          <Link
            to={`/p/${encodeURIComponent(publisher)}`}
            title="Open publisher profile"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-2.5 py-1 font-mono text-[11.5px] font-medium tabular tracking-tight text-foreground transition-colors hover:border-border-strong hover:bg-surface hover:text-foreground"
          >
            <Fingerprint className="size-3" strokeWidth={1.85} aria-hidden />
            {shorten(publisher, 6, 6)}
          </Link>
          <a
            href={explorer_address_url(publisher)}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="View publisher on the Solana explorer"
            title="Solana explorer"
            className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <ExternalLink className="size-2.5" strokeWidth={1.85} aria-hidden />
          </a>
          <CopyButton value={publisher} label="Publisher" inline />
        </span>
      </div>
    </div>
  );
}

function Chip({
  icon,
  children,
  trailing,
  variant = 'default',
  mono,
  href,
  title,
}: {
  icon?: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
  variant?: 'default' | 'accent';
  mono?: boolean;
  href?: string;
  title?: string;
}) {
  const base = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium tracking-tight',
    variant === 'accent'
      ? 'border-accent/30 bg-accent/10 text-accent'
      : 'border-border bg-surface/50 text-foreground-soft',
    mono && 'font-mono tabular text-foreground',
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        title={title}
        className={cn(
          base,
          'transition-colors hover:border-border-strong hover:bg-surface hover:text-foreground',
        )}
      >
        {icon}
        {children}
        {trailing}
      </a>
    );
  }

  return (
    <span title={title} className={base}>
      {icon}
      {children}
      {trailing}
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/60">
      ·
    </span>
  );
}

function ProvenanceDisclosure({ release }: { release: VerifiedRelease }) {
  const [open, set_open] = useState(false);
  const manifest = release.manifest;
  const event = release.release;

  return (
    <details
      onToggle={(e) => set_open(e.currentTarget.open)}
      className="border-t border-border"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-[11.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground-soft [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform duration-200',
            open && 'rotate-180',
          )}
          strokeWidth={2}
          aria-hidden
        />
        <span>Provenance</span>
      </summary>

      <div className="grid gap-5 pb-1">
        <ProofGroup
          title="Registry"
          caption="Where this release lives on Solana"
        >
          <ProofRow
            label="Release"
            display={shorten(release.release_address, 6, 6)}
            value={release.release_address}
            copyable
            explorer_url={explorer_address_url(release.release_address)}
          />
          <ProofRow
            label="Program"
            display={shorten(manifest.chain.program_id, 6, 6)}
            value={manifest.chain.program_id}
            copyable
            explorer_url={explorer_address_url(manifest.chain.program_id)}
          />
          <ProofRow
            label="Network"
            display={manifest.chain.chain_id}
            value={manifest.chain.chain_id}
          />
        </ProofGroup>

        <ProofGroup
          title="Content"
          caption="What was signed, and by whom"
        >
          <ProofRow
            label="Hash"
            display={shorten(event.content_hash, 14, 8)}
            value={event.content_hash}
            copyable
          />
          <ProofRow
            label="Signature"
            display={shorten(manifest.signature, 14, 8)}
            value={manifest.signature}
            copyable
          />
        </ProofGroup>

        <ProofGroup
          title="Manifest"
          caption="The signed file index your browser fetched"
        >
          <ProofRow
            label="Hash"
            display={shorten(event.manifest_hash, 14, 8)}
            value={event.manifest_hash}
            copyable
          />
          <ProofRow
            label="Location"
            display={shorten(release.manifest_uri, 8, 12)}
            value={release.manifest_uri}
            copyable
          />
          <ProofRow
            label="Mirrors"
            aside={
              <GatewayLinks
                uri={release.manifest_uri}
                irys_gateway={env.VITE_GUTENBERG_IRYS_GATEWAY}
                arweave_mirrors={env.VITE_GUTENBERG_ARWEAVE_MIRRORS}
              />
            }
          />
        </ProofGroup>
      </div>
    </details>
  );
}

function ProofGroup({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-1 sm:px-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-soft">
          {title}
        </h2>
        <span className="text-[11px] text-muted-foreground">{caption}</span>
      </div>
      <dl className="grid">{children}</dl>
    </div>
  );
}

function ProofRow({
  label,
  display,
  value,
  copyable,
  explorer_url,
  aside,
}: {
  label: string;
  display?: string;
  value?: string;
  copyable?: boolean;
  explorer_url?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-start gap-3 px-1 py-1 sm:px-2">
      <dt className="pt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="grid min-w-0 gap-2">
        {display !== undefined ? (
          <span
            title={display === value ? undefined : value}
            className="block truncate font-mono text-[12px] tabular text-foreground"
          >
            {display}
          </span>
        ) : null}
        {aside}
      </dd>
      <div className="ml-auto flex items-center gap-0.5">
        {explorer_url ? (
          <ExplorerLink href={explorer_url} label={label} />
        ) : null}
        {copyable && value !== undefined ? (
          <CopyButton value={value} label={label} />
        ) : null}
      </div>
    </div>
  );
}

function shorten(value: string, head = 8, tail = 8): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function format_date(iso: string): string {
  try {
    const d = new Date(iso);

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

function format_bytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function ExplorerLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`View ${label} on block explorer`}
      title="View on block explorer"
      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground active:translate-y-px"
    >
      <ExternalLink className="size-3" strokeWidth={1.85} aria-hidden />
    </a>
  );
}

function CopyButton({
  value,
  label,
  inline,
}: {
  value: string;
  label: string;
  inline?: boolean;
}) {
  const [copied, set_copied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const id = window.setTimeout(() => set_copied(false), 1400);

    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => set_copied(true))
          .catch(() => set_copied(false));
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground active:translate-y-px',
        inline ? 'size-5' : 'size-6',
      )}
    >
      {copied ? (
        <Check
          className={cn('text-accent', inline ? 'size-2.5' : 'size-3')}
          strokeWidth={2.4}
          aria-hidden
        />
      ) : (
        <Copy
          className={inline ? 'size-2.5' : 'size-3'}
          strokeWidth={1.85}
          aria-hidden
        />
      )}
    </button>
  );
}
