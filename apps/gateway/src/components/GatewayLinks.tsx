import { ExternalLink } from 'lucide-react';

import { gateway_host } from '@/lib/gateway-list';
import { resolve_content_urls } from '@/lib/storage';

export function GatewayLinks({
  uri,
  gateways,
  label = 'Open via',
}: {
  uri: string;
  gateways: readonly string[];
  label?: string;
}) {
  const links = resolve_content_urls(uri, gateways);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      {links.map(({ gateway, url }) => {
        const host = gateway_host(gateway);

        return (
          <a
            key={gateway}
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            title={`Open via ${host}`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10.5px] tabular text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground"
          >
            {host}
            <ExternalLink
              className="size-2.5"
              strokeWidth={1.85}
              aria-hidden
            />
          </a>
        );
      })}
    </div>
  );
}
