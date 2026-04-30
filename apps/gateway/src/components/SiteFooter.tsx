import { Link } from 'react-router-dom';

import { Wordmark } from '@/components/Wordmark';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-10 lg:px-10 lg:py-12">
        <div className="grid gap-2.5">
          <Wordmark className="text-foreground" showSubmark={false} />
          <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
            A reader for content published to Solana. The bytes you see were
            verified, in your browser, against the publisher&apos;s signature.
          </p>
        </div>

        <div className="grid content-start gap-2 text-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            What gets verified
          </p>
          <ul className="grid gap-1.5 text-foreground/85">
            <li>Manifest signature (Ed25519)</li>
            <li>Bundle hash (SHA-256)</li>
            <li>Per-file hashes (SHA-256)</li>
          </ul>
        </div>

        <div className="grid content-start gap-2 text-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            Navigation
          </p>
          <ul className="grid gap-1.5">
            <li>
              <Link
                to="/"
                className="text-foreground/85 underline-offset-4 hover:text-foreground hover:underline"
              >
                Lookup a release
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground/85 underline-offset-4 hover:text-foreground hover:underline"
              >
                Project source
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto max-w-7xl px-6 py-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 lg:px-10">
          Local verification · No bundler-side trust
        </p>
      </div>
    </footer>
  );
}
