import {
  GUTENBERG_REGISTRY_PROGRAM_ID,
  infer_chain_id,
  type ChainId,
} from '@gutenberg/core';
import { Link } from 'react-router-dom';

import { IndexerStatus } from '@/components/IndexerStatus';
import { SolanaHorizontalLogo } from '@/components/SolanaHorizontalLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wordmark } from '@/components/Wordmark';
import { env } from '@/env';
import { explorer_address_url } from '@/lib/explorer';
import { shorten } from '@/lib/format';
import { registry_shell_x } from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

const GUTENBERG_REPO_HREF = 'https://github.com/gutenberg-sh/gutenberg';

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
    <footer className="mt-auto border-t border-border bg-surface dark:bg-background">
      <div
        className={cn(
          'mx-auto grid w-full max-w-[1332px] gap-8 py-10',
          registry_shell_x,
        )}
      >
        <div className="grid gap-3">
          <Wordmark className="text-foreground" showSubmark={false} />
          <p className="max-w-[44ch] text-[12.5px] leading-[1.65] text-foreground-soft">
            Publish freely, anonymously, and permanently.
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

        <div className="flex flex-row items-center justify-between gap-4 border-t border-border pt-8">
          <a
            href="https://solana.com"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Built on Solana (opens solana.com)"
            className="inline-flex min-w-0 items-center gap-3 text-muted-foreground transition-colors hover:text-foreground active:translate-y-px"
          >
            <span className="shrink-0 text-[12px] font-medium text-muted-foreground">
              Built on
            </span>
            <SolanaHorizontalLogo className="h-[13px] w-auto shrink-0 text-foreground sm:h-[14px] md:h-[15px]" />
          </a>
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6 text-[13px] font-medium text-muted-foreground"
        >
          <FooterLink to="/browse">Browse</FooterLink>
          <a
            href={GUTENBERG_REPO_HREF}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>

        <div
          aria-label="Deployment"
          className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground"
        >
          <p className="min-w-0 wrap-break-word">
            <span className="text-foreground-soft">Cluster</span>{' '}
            <span className="text-foreground">{FOOTER_CLUSTER_LABEL}</span>
            <span aria-hidden className="mx-2 text-border">
              ·
            </span>
            <span className="text-foreground-soft">Program</span>{' '}
            <a
              href={FOOTER_PROGRAM_EXPLORER}
              target="_blank"
              rel="noreferrer noopener"
              title={GUTENBERG_REGISTRY_PROGRAM_ID}
              className="font-mono text-[11px] text-foreground underline-offset-[3px] transition-colors hover:underline"
            >
              {shorten(GUTENBERG_REGISTRY_PROGRAM_ID, 5, 5)}
            </a>
          </p>
          <div className="shrink-0">
            <IndexerStatus />
          </div>
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
