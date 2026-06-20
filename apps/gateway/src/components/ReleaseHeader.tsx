import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { GatewayLinks } from '@/components/GatewayLinks';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    <header aria-label="Release" className="grid gap-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Publication
      </p>

      <div className="grid gap-4">
        <h1 className="text-balance text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
          <Link
            to={`/publication/${encodeURIComponent(manifest.registry_id)}`}
            className="hover:underline"
            title="Open the latest version"
          >
            {manifest.registry_id}
          </Link>
          <span className="ml-2.5 inline-flex translate-y-[-0.03em] align-middle">
            <span className="rounded-lg border border-border-strong bg-surface px-2.5 py-1 font-mono text-[14px] font-normal tabular leading-none text-foreground sm:text-[15px]">
              {manifest.version}
            </span>
          </span>
          <Link
            to={`/publication/${encodeURIComponent(manifest.registry_id)}/versions`}
            className="ml-2.5 inline-flex items-center gap-1 align-middle text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground sm:ml-3"
            title="Version history"
          >
            <GitBranch className="size-3" strokeWidth={1.85} aria-hidden />
            Versions
          </Link>
        </h1>
      </div>

      <IdentityStrip published_at={manifest.published_at} />

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
    </header>
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
    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-medium tracking-tight',
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
    <Collapsible
      defaultOpen={false}
      className={cn(
        'scroll-mt-8 border-t border-border pt-6 lg:pt-8',
        className,
      )}
    >
      <section id="provenance" aria-labelledby="provenance-heading">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:[&_svg]:rotate-180"
          >
            <span className="grid w-full max-w-[65ch] gap-1.5">
              <span
                id="provenance-heading"
                className="text-[0.95rem] font-semibold leading-tight tracking-[-0.02em] text-foreground"
              >
                Provenance
              </span>
              <span className="text-[11.5px] leading-[1.45] text-foreground-soft">
                On-chain accounts, hashes, and signatures. Copy a value or open
                it in the explorer.
              </span>
            </span>
            <ChevronDown
              className="mt-0.5 size-4 shrink-0 text-foreground-soft transition-transform duration-200"
              strokeWidth={1.85}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="pt-4">
            <div className="rounded-lg border border-border/90 bg-surface/45 p-3 sm:p-4 lg:p-5 dark:bg-surface/35">
              <div className="grid w-full gap-5">
                <ProofGroup
                  title="Registry"
                  caption="Solana accounts"
                  className="min-w-0"
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
                  caption="Payload hash and author signature"
                  className="min-w-0 border-t border-border/45 pt-5"
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
                  caption="Signed index and fetch locations"
                  className="min-w-0 border-t border-border/45 pt-5"
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
                        variant="plain"
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
        </CollapsibleContent>
      </section>
    </Collapsible>
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
    <div className={cn('grid gap-2', className)}>
      <div className="grid gap-0.5 border-b border-border/50 pb-2">
        <h3 className="text-left text-[12px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
          {title}
        </h3>
        <p className="text-left text-[10.5px] leading-[1.45] text-muted-foreground">
          {caption}
        </p>
      </div>
      <dl className="divide-y divide-border/45">{children}</dl>
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
    <div className="grid gap-1 py-2 first:pt-0.5 sm:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] sm:items-start sm:gap-x-4 sm:gap-y-0 sm:py-1.5 lg:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)]">
      <dt className="text-[11px] font-medium leading-snug text-muted-foreground sm:pt-0.5">
        {label}
      </dt>
      <dd className="m-0 min-w-0">
        {display !== undefined ? (
          <div className="flex w-full items-start justify-between gap-2">
            <span
              title={value ?? display}
              className="min-w-0 flex-1 truncate font-mono text-[11.5px] leading-snug tabular text-foreground sm:text-[12px]"
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
              display !== undefined && 'mt-2',
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
      className="inline-flex size-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground active:translate-y-px"
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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => set_copied(true))
          .catch(() => set_copied(false));
      }}
      className={cn(
        'rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground',
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
    </Button>
  );
}
