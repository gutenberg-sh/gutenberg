import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
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
    <section aria-label="Publication" className="grid gap-5">
      <IdentityStrip published_at={manifest.published_at} />

      <div className="grid gap-4">
        <h1 className="text-balance font-semibold tracking-[-0.02em] text-foreground">
          <Link
            to={`/publication/${encodeURIComponent(manifest.name)}`}
            className="text-[1.625rem] leading-[1.16] hover:underline sm:text-[2rem] lg:text-[2.35rem]"
            title="Open the latest version"
          >
            {manifest.name}
          </Link>
          <span className="ml-2.5 inline-flex align-middle">
            <span className="rounded-none border border-border-strong bg-surface px-2 py-0.5 font-mono text-[0.72em] font-normal tabular text-foreground sm:text-[0.76em]">
              {manifest.version}
            </span>
          </span>
          <Link
            to={`/publication/${encodeURIComponent(manifest.name)}/versions`}
            className="ml-2.5 inline-flex items-center gap-1 align-middle text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground sm:ml-3"
            title="Version history"
          >
            <GitBranch className="size-3" strokeWidth={1.85} aria-hidden />
            Versions
          </Link>
        </h1>
      </div>

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
              className="rounded-none border border-border px-2 py-0.5 font-mono text-[10.5px] tabular text-foreground-soft"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function IdentityStrip({ published_at }: { published_at: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
      <Chip
        variant="accent"
        title="Manifest signature and content hashes matched the on-chain record for this release."
        icon={<ShieldCheck className="size-3" strokeWidth={1.85} aria-hidden />}
      >
        Verified
      </Chip>

      <Chip
        icon={<Calendar className="size-3" strokeWidth={1.85} aria-hidden />}
      >
        {format_date(published_at)}
      </Chip>
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
    'inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-[11.5px] font-medium tracking-tight',
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

export function ProvenancePanel({
  release,
  className,
}: {
  release: VerifiedRelease;
  className?: string;
}) {
  const manifest = release.manifest;
  const event = release.release;

  return (
    <section
      id="provenance"
      aria-labelledby="provenance-heading"
      className={cn(
        'scroll-mt-8 border-t border-border pt-8 lg:pt-10',
        className,
      )}
    >
      <div className="grid gap-8 lg:gap-10">
        <header className="grid max-w-[72ch] gap-2">
          <h2
            id="provenance-heading"
            className="text-[0.95rem] font-semibold leading-tight tracking-[-0.02em] text-foreground"
          >
            Provenance
          </h2>
          <p className="text-pretty text-[12.5px] leading-relaxed text-muted-foreground">
            Registry fields, hashes, and signatures for this release. Copy values
            or follow links to the explorer.
          </p>
        </header>

        <div className="rounded-none border border-border/90 bg-surface/45 p-5 shadow-[inset_0_1px_0_oklch(1_0_0/5%)] sm:p-6 dark:bg-surface/35 dark:shadow-[inset_0_1px_0_oklch(1_0_0/6%)]">
          <div className="grid gap-10 sm:gap-12">
            <ProofGroup
              title="Registry"
              caption="Account and program on Solana"
            >
              <ProofRow
                label="Publication"
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
              title="Content & signature"
              caption="Payload hash and author signature on the manifest"
            >
              <ProofRow
                label="Content hash"
                display={shorten(event.content_hash, 14, 8)}
                value={event.content_hash}
                copyable
              />
              <ProofRow
                label="Manifest signature"
                display={shorten(manifest.signature, 14, 8)}
                value={manifest.signature}
                copyable
              />
            </ProofGroup>

            <ProofGroup
              title="Manifest"
              caption="The signed index for this release"
            >
              <ProofRow
                label="Manifest hash"
                display={shorten(event.manifest_hash, 14, 8)}
                value={event.manifest_hash}
                copyable
              />
              <ProofRow
                label="Source URI"
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
        </div>
      </div>
    </section>
  );
}

function ProofGroup({
  title,
  caption,
  children,
  className,
}: {
  title: string;
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4', className)}>
      <div className="grid gap-1 border-b border-border/60 pb-3">
        <h3 className="text-[13px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
          {title}
        </h3>
        <p className="max-w-[62ch] text-[11.5px] leading-relaxed text-muted-foreground">
          {caption}
        </p>
      </div>
      <dl className="grid gap-0">{children}</dl>
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
  icon,
}: {
  label: string;
  display?: string;
  value?: string;
  copyable?: boolean;
  explorer_url?: string;
  aside?: ReactNode;
  icon?: ReactNode;
}) {
  const has_actions = Boolean(
    explorer_url || (copyable && value !== undefined),
  );

  return (
    <div className="border-b border-border/40 py-3.5 last:border-b-0 last:pb-0">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="m-0 mt-2 min-w-0">
        {display !== undefined ? (
          <div className="flex w-full items-start justify-between gap-3">
            <span
              title={value && display !== value ? value : undefined}
              className="min-w-0 flex-1 break-all font-mono text-[12px] leading-snug tabular text-foreground"
            >
              {display}
            </span>
            {has_actions ? (
              <div className="flex shrink-0 items-center gap-0.5 pt-px">
                {explorer_url ? (
                  <ExplorerLink href={explorer_url} label={label} />
                ) : null}
                {copyable && value !== undefined ? (
                  <CopyButton value={value} label={label} />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {aside ? (
          <div
            className={cn(
              'flex w-full min-w-0 flex-wrap items-start gap-2',
              display !== undefined && 'mt-3',
            )}
          >
            {icon}
            <div className="min-w-0 flex-1">{aside}</div>
            {has_actions && display === undefined ? (
              <div className="flex shrink-0 items-center gap-0.5">
                {explorer_url ? (
                  <ExplorerLink href={explorer_url} label={label} />
                ) : null}
                {copyable && value !== undefined ? (
                  <CopyButton value={value} label={label} />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </dd>
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
      className="inline-flex size-6 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-surface hover:text-foreground active:translate-y-px"
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
        'inline-flex items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-surface hover:text-foreground active:translate-y-px',
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
