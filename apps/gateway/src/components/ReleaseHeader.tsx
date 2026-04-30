import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { GatewayLinks } from '@/components/GatewayLinks';
import { env } from '@/env';
import { explorer_address_url } from '@/lib/explorer';
import type { VerifiedRelease } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ReleaseHeader({ release }: { release: VerifiedRelease }) {
  const manifest = release.manifest;
  const file_count = Object.keys(manifest.files).length;

  return (
    <section aria-label="Release" className="grid gap-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium tracking-tight text-accent">
          <ShieldCheck className="size-3.5" strokeWidth={1.85} aria-hidden />
          Verified
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Published {format_date(manifest.created_at)}
        </span>
        {manifest.license ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            · {manifest.license}
          </span>
        ) : null}
        {manifest.language ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            · {manifest.language}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3">
        <h1 className="font-semibold tracking-[-0.034em] text-foreground">
          <span className="text-[2rem] sm:text-[2.5rem] lg:text-[3rem]">
            {manifest.name}
          </span>
          <span className="ml-3 font-mono text-[1.25rem] font-normal tabular text-foreground-soft sm:text-[1.5rem] lg:text-[1.75rem]">
            {manifest.version}
          </span>
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-[1.6] text-foreground-soft sm:text-[16px]">
          {file_count} file{file_count === 1 ? '' : 's'}, fetched + verified
          individually as you browse. The reading index sits in the rail to
          the left.
        </p>
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
      </div>

      <dl className="grid divide-y divide-border border-y border-border text-[13px] sm:grid-cols-2 sm:divide-y-0 sm:[&>div:nth-child(odd)]:border-r sm:[&>div]:border-border">
        <FactRow
          label="Publisher"
          value={manifest.publisher}
          mono
          copyable
          explorer_url={explorer_address_url(manifest.publisher)}
        />
        <FactRow label="Files" value={file_count.toString()} mono />
        <FactRow
          label="Manifest"
          value={release.manifest_uri}
          mono
          copyable
          break_all
          extras={
            <GatewayLinks
              uri={release.manifest_uri}
              gateways={env.VITE_GUTENBERG_ARWEAVE_GATEWAYS}
            />
          }
        />
        <FactRow
          label="Content hash"
          value={release.release.content_hash}
          mono
          copyable
          break_all
        />
        <FactRow
          label="Release PDA"
          value={release.release_pda}
          mono
          copyable
          break_all
          explorer_url={explorer_address_url(release.release_pda)}
        />
        <FactRow
          label="Chain"
          value={`${manifest.chain.chain_id} · ${shorten(manifest.chain.program_id)}`}
          mono
        />
      </dl>
    </section>
  );
}

function shorten(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
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

function FactRow({
  label,
  value,
  mono,
  break_all,
  copyable,
  explorer_url,
  extras,
}: {
  label: string;
  value: string;
  mono?: boolean;
  break_all?: boolean;
  copyable?: boolean;
  explorer_url?: string;
  extras?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-baseline gap-3 px-1 py-3.5 sm:px-3.5">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </dt>
      <dd className="grid min-w-0 gap-2">
        <span
          className={cn(
            'text-foreground',
            mono && 'font-mono tabular text-[12.5px]',
            break_all && 'break-all',
          )}
        >
          {value}
        </span>
        {extras}
      </dd>
      <div className="ml-auto flex items-center gap-0.5">
        {explorer_url ? (
          <ExplorerLink href={explorer_url} label={label} />
        ) : null}
        {copyable ? <CopyButton value={value} label={label} /> : null}
      </div>
    </div>
  );
}

function ExplorerLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`View ${label} on block explorer`}
      title="View on block explorer"
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground active:translate-y-px"
    >
      <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
    </a>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
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
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => set_copied(true))
          .catch(() => set_copied(false));
      }}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground active:translate-y-px"
    >
      {copied ? (
        <Check className="size-3.5 text-accent" strokeWidth={2.4} aria-hidden />
      ) : (
        <Copy className="size-3.5" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
