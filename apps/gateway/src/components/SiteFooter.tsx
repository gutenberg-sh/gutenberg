import { Link } from 'react-router-dom';

import { IndexerStatus } from '@/components/IndexerStatus';
import { SolanaHorizontalLogo } from '@/components/SolanaHorizontalLogo';
import { Wordmark } from '@/components/Wordmark';

const GUTENBERG_REPO_HREF = 'https://github.com/leonmeka/gutenberg';

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

        <div className="flex justify-start border-t border-border pt-8">
          <a
            href="https://solana.com"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Built on Solana — opens solana.com"
            className="inline-flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground active:translate-y-px"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
              Built on
            </span>
            <SolanaHorizontalLogo className="h-[13px] w-auto shrink-0 text-foreground sm:h-[14px] md:h-[15px]" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            <FooterLink to="/browse">Browse</FooterLink>
            <FooterLink to="/search">Search</FooterLink>
            <a
              href={GUTENBERG_REPO_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-foreground"
            >
              Source
            </a>
          </nav>
          <div className="ml-auto shrink-0">
            <IndexerStatus />
          </div>
        </div>
      </div>
    </footer>
  );
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
