import { ExternalLink } from 'lucide-react';

import { gateway_host } from '@/lib/gateway-list';
import { resolve_content_links, type ResolvedGatewayLink } from '@/lib/storage';

export function GatewayLinks({
  uri,
  irys_gateway,
  arweave_mirrors,
  variant = 'chips',
}: {
  uri: string;
  irys_gateway: string;
  arweave_mirrors: readonly string[];
  variant?: 'chips' | 'plain';
}) {
  const links = resolve_content_links(uri, irys_gateway, arweave_mirrors);

  if (links.length === 0) {
    return null;
  }

  if (variant === 'plain') {
    return (
      <ul className="m-0 flex list-none flex-col flex-wrap gap-x-5 gap-y-1 p-0 sm:flex-row sm:items-center">
        {links.map((link) => (
          <li key={link.gateway} className="min-w-0 shrink-0">
            <PlainLink link={link} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {links.map((link) => (
        <Chip key={link.gateway} link={link} />
      ))}
    </div>
  );
}

function PlainLink({ link }: { link: ResolvedGatewayLink }) {
  const host = gateway_host(link.gateway);
  const title =
    link.kind === 'canonical'
      ? `Canonical: open via ${host} (Irys)`
      : `Mirror: open via ${host}`;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer noopener"
      title={title}
      className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 text-[11px] font-mono tabular leading-snug text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
    >
      <span className="min-w-0 truncate">{host}</span>
      <ExternalLink
        className="size-2.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-80"
        strokeWidth={1.85}
        aria-hidden
      />
    </a>
  );
}

function Chip({ link }: { link: ResolvedGatewayLink }) {
  const host = gateway_host(link.gateway);
  const classes =
    link.kind === 'canonical'
      ? 'border-accent/40 bg-accent/5 text-foreground hover:border-accent hover:bg-accent/10'
      : 'border-border text-foreground-soft hover:border-border-strong hover:text-foreground';

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer noopener"
      title={
        link.kind === 'canonical'
          ? `Canonical: open via ${host} (Irys)`
          : `Mirror: open via ${host}`
      }
      className={`inline-flex cursor-pointer items-center gap-1 rounded-none border px-1.5 py-0 font-mono text-[10px] tabular transition-colors ${classes}`}
    >
      {host}
      <ExternalLink className="size-2.5" strokeWidth={1.85} aria-hidden />
    </a>
  );
}
