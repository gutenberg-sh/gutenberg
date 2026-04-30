import { Link } from 'react-router-dom';

import { Wordmark } from '@/components/Wordmark';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div className="grid gap-3">
          <Wordmark className="text-foreground" showSubmark={false} />
          <p className="max-w-[44ch] text-[13.5px] leading-relaxed text-foreground-soft">
            Gutenberg lets anyone publish freely, privately, and permanently on
            Solana.
          </p>
        </div>

        <div className="grid content-start gap-3 text-[13px]">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Verifies
          </p>
          <ul className="grid gap-2 text-foreground">
            <li className="flex items-center gap-2">
              <Tick /> Manifest signature
              <span className="text-muted-foreground/60">·</span>
              <span className="font-mono text-[11.5px] text-muted-foreground">
                Ed25519
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Tick /> Bundle hash
              <span className="text-muted-foreground/60">·</span>
              <span className="font-mono text-[11.5px] text-muted-foreground">
                SHA-256
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Tick /> Per-file hashes
              <span className="text-muted-foreground/60">·</span>
              <span className="font-mono text-[11.5px] text-muted-foreground">
                SHA-256
              </span>
            </li>
          </ul>
        </div>

        <div className="grid content-start gap-3 text-[13px]">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Navigate
          </p>
          <ul className="grid gap-2">
            <li>
              <Link
                to="/"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Lookup a release
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/leonmeka/gutenberg"
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Project source
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-[11px] text-muted-foreground/80 lg:px-10">
          <p className="uppercase tracking-[0.22em]">
            Local verification · No bundler-side trust
          </p>
          <p className="font-mono tabular text-[11px] text-muted-foreground/70">
            v0.1
          </p>
        </div>
      </div>
    </footer>
  );
}

function Tick() {
  return (
    <span
      aria-hidden
      className="inline-flex size-3.5 items-center justify-center rounded-full bg-accent/15 text-accent"
    >
      <svg
        viewBox="0 0 12 12"
        className="size-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 6.5l2.4 2.4L9.5 3.5" />
      </svg>
    </span>
  );
}
