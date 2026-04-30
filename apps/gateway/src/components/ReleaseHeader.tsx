import { Check, Copy, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import type { GutenbergManifest } from '@/lib/types';

export function ReleaseHeader({
  manifest,
  manifest_uri,
  release_pda,
}: {
  manifest: GutenbergManifest;
  manifest_uri: string;
  release_pda?: string;
}) {
  const file_count = Object.keys(manifest.files).length;

  return (
    <section
      aria-label="Release"
      className="relative grid gap-6 border-y border-border/70 py-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium tracking-tight text-accent-foreground/90 dark:text-accent">
          <ShieldCheck className="size-3.5" strokeWidth={1.75} aria-hidden />
          Verified release
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
          Published {format_date(manifest.created_at)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-10">
        <div className="grid gap-2">
          <h1 className="font-semibold tracking-[-0.02em]">
            <span className="text-[28px] sm:text-[34px]">{manifest.name}</span>
            <span className="ml-2 font-mono text-[18px] font-normal tabular text-muted-foreground sm:text-[22px]">
              {manifest.version}
            </span>
          </h1>
          <p className="max-w-[60ch] text-sm text-muted-foreground">
            {file_count} file{file_count === 1 ? '' : 's'} in the verified
            bundle. Use the index on the left to read them.
          </p>
        </div>
      </div>

      <dl className="grid gap-0 divide-y divide-border/70 border-t border-border/70 text-[13px] sm:grid-cols-2 sm:divide-y-0 sm:[&>div:nth-child(odd)]:border-r sm:[&>div]:border-border/70">
        <FactRow label="Publisher" value={manifest.publisher} mono copyable />
        <FactRow label="Files" value={file_count.toString()} mono />
        <FactRow label="Manifest" value={manifest_uri} mono copyable break_all />
        <FactRow label="Bundle" value={manifest.bundle_uri} mono copyable break_all />
        {release_pda ? (
          <FactRow label="Release PDA" value={release_pda} mono copyable break_all />
        ) : null}
      </dl>
    </section>
  );
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
}: {
  label: string;
  value: string;
  mono?: boolean;
  break_all?: boolean;
  copyable?: boolean;
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-baseline gap-3 px-1 py-3 sm:px-3">
      <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 text-foreground',
          mono && 'font-mono tabular text-[12.5px]',
          break_all && 'break-all',
        )}
      >
        {value}
      </dd>
      <div className="ml-auto">
        {copyable ? <CopyButton value={value} label={label} /> : null}
      </div>
    </div>
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
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:translate-y-[1px]"
    >
      {copied ? (
        <Check className="size-3.5 text-accent" strokeWidth={2} aria-hidden />
      ) : (
        <Copy className="size-3.5" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
