import { Link } from 'react-router-dom';

import { IndexerStatus } from '@/components/IndexerStatus';
import { Wordmark } from '@/components/Wordmark';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-12 lg:px-10">
        <div className="grid gap-3">
          <Wordmark className="text-foreground" showSubmark={false} />
          <p className="max-w-[44ch] text-[13.5px] leading-relaxed text-foreground-soft">
            Gutenberg lets anyone publish freely, privately, and permanently
            on Solana.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-5 text-[12px]">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground"
          >
            <FooterLink to="/browse">Browse</FooterLink>
            <FooterLink to="/search">Search</FooterLink>
            <a
              href="https://github.com/leonmeka/gutenberg"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-foreground"
            >
              Source
            </a>
          </nav>
          <IndexerStatus />
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
