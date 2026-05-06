import {
  GUTENBERG_REGISTRY_PROGRAM_ID,
  infer_chain_id,
  type ChainId,
} from '@gutenberg/core';
import { Github } from 'lucide-react';
import { Link } from 'react-router-dom';

import { IndexerStatus } from '@/components/IndexerStatus';
import { SolanaHorizontalLogo } from '@/components/SolanaHorizontalLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wordmark } from '@/components/Wordmark';
import { env } from '@/env';
import { explorer_address_url } from '@/lib/explorer';
import { shorten } from '@/lib/format';

const GUTENBERG_REPO_HREF = 'https://github.com/leonmeka/gutenberg';

const FOOTER_CHAIN_ID = infer_chain_id(env.VITE_GUTENBERG_SOLANA_RPC_URL);
const FOOTER_CLUSTER_LABEL = cluster_label(
  FOOTER_CHAIN_ID,
  env.VITE_GUTENBERG_SOLANA_RPC_URL,
);
const FOOTER_PROGRAM_EXPLORER = explorer_address_url(
  GUTENBERG_REGISTRY_PROGRAM_ID,
);

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-border bg-background">
      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid gap-3">
          <Wordmark className="text-foreground" showSubmark={false} />
          <p className="max-w-[44ch] text-[12.5px] leading-[1.65] text-foreground-soft">
            Publish freely, privately, and permanently.
          </p>
          <p className="max-w-[48ch] text-[12.5px] leading-[1.65] text-foreground-soft">
            Gutenberg is{' '}
            <a
              href={GUTENBERG_REPO_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline-offset-[3px] transition-colors hover:underline"
            >
              fully open source
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <a
            href="https://solana.com"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Built on Solana — opens solana.com"
            className="inline-flex w-fit items-center gap-3 text-muted-foreground transition-colors hover:text-foreground active:translate-y-px"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
              Built on
            </span>
            <SolanaHorizontalLogo className="h-[13px] w-auto shrink-0 text-foreground sm:h-[14px] md:h-[15px]" />
          </a>
          <div className="flex w-full justify-start sm:w-auto sm:shrink-0 sm:justify-end">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-6 sm:gap-y-0">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            <FooterLink to="/browse">Browse</FooterLink>
            <FooterLink to="/search">Search</FooterLink>
            <a
              href={GUTENBERG_REPO_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Github
                className="size-3.5 shrink-0"
                strokeWidth={1.75}
                aria-hidden
              />
              GitHub
            </a>
          </nav>
          <div className="min-w-0 self-start sm:max-w-[min(100%,32rem)] sm:self-auto sm:shrink-0 sm:text-right">
            <IndexerStatus />
          </div>
        </div>

        <div
          aria-label="Deployment"
          className="border-t border-border pt-4 font-mono text-[11px] leading-relaxed tracking-[0.02em] text-muted-foreground"
        >
          <p className="wrap-break-word">
            <span className="text-foreground-soft">Cluster</span>{' '}
            <span className="text-foreground">{FOOTER_CLUSTER_LABEL}</span>
            <span aria-hidden className="mx-2 text-border">
              ·
            </span>
            <span className="text-foreground-soft">Registry program</span>{' '}
            <a
              href={FOOTER_PROGRAM_EXPLORER}
              target="_blank"
              rel="noreferrer noopener"
              title={GUTENBERG_REGISTRY_PROGRAM_ID}
              className="text-foreground underline-offset-[3px] transition-colors hover:underline"
            >
              {shorten(GUTENBERG_REGISTRY_PROGRAM_ID, 5, 5)}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function cluster_label(chain_id: ChainId, rpc_url: string): string {
  const key = chain_id.replace(/^solana:/, '');
  if (key === 'unknown') {
    try {
      return new URL(rpc_url).hostname;
    } catch {
      return 'Unknown';
    }
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} className="transition-colors hover:text-foreground">
      {children}
    </Link>
  );
}
