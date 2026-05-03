import { Link } from 'react-router-dom';

import { IndexerStatus } from '@/components/IndexerStatus';
import { Wordmark } from '@/components/Wordmark';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-border bg-background">
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-4 py-10 sm:px-6 lg:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          &lt; telemetry · public readout &gt;
        </p>
        <div className="grid gap-3">
          <Wordmark className="text-foreground" showSubmark={false} />
          <p className="max-w-[44ch] text-[12.5px] leading-[1.65] text-foreground-soft">
            Publish freely, privately, and permanently. Verified by every
            browser, owned by no one.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
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
