import { ExternalLink } from 'lucide-react';

import { gateway_host } from '@/lib/gateway-list';
import { resolve_content_links, type ResolvedGatewayLink } from '@/lib/storage';

export function GatewayLinks({
  uri,
  irys_gateway,
  arweave_mirrors,
}: {
  uri: string;
  irys_gateway: string;
  arweave_mirrors: readonly string[];
}) {
  const links = resolve_content_links(uri, irys_gateway, arweave_mirrors);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {links.map((link) => (
        <Chip key={link.gateway} link={link} />
      ))}
    </div>
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
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0 font-mono text-[10px] tabular transition-colors ${classes}`}
    >
      {host}
      <ExternalLink className="size-2.5" strokeWidth={1.85} aria-hidden />
    </a>
  );
}
