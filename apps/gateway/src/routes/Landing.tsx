import { ArrowUpRight, FileSignature, Fingerprint, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

import { LookupForm } from '@/components/LookupForm';

const TRUST_BULLETS: ReadonlyArray<{
  label: string;
  detail: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  {
    label: 'Manifest signature',
    detail: 'Ed25519 signature checked against the publisher key on chain.',
    icon: FileSignature,
  },
  {
    label: 'Bundle hash',
    detail: 'The whole release archive is rehashed and matched to the manifest.',
    icon: Layers,
  },
  {
    label: 'File hashes',
    detail: 'Every file you read is rehashed before it touches the renderer.',
    icon: Fingerprint,
  },
];

const EXAMPLES: ReadonlyArray<{ name: string; version: string; note: string }> =
  [
    {
      name: 'gutenberg-demo',
      version: '1.0.0',
      note: 'small markdown release',
    },
  ];

export function LandingRoute() {
  return (
    <div className="grid gap-16 lg:gap-24">
      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <div className="grid gap-7">
          <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full bg-accent"
            />
            Gutenberg gateway
          </p>

          <h1 className="text-[2.4rem] font-semibold leading-[1.04] tracking-[-0.025em] sm:text-[3.1rem] lg:text-[3.6rem]">
            Read what was{' '}
            <span className="font-serif italic font-normal text-foreground/90">
              actually
            </span>{' '}
            published.
          </h1>

          <p className="max-w-[58ch] text-base leading-relaxed text-muted-foreground sm:text-[17px]">
            Open any release recorded on the Gutenberg registry. Your browser
            fetches the manifest and the bundle, recomputes every hash, and
            checks the publisher&apos;s signature{' '}
            <span className="text-foreground">before</span> rendering a single
            byte.
          </p>

          <ul className="mt-2 grid gap-3 text-[13px] sm:grid-cols-3">
            {TRUST_BULLETS.map(({ label, detail, icon: Icon }) => (
              <li
                key={label}
                className="grid gap-1.5 border-t border-border/80 pt-3"
              >
                <span className="inline-flex items-center gap-2 text-foreground">
                  <Icon
                    className="size-3.5 text-accent"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="font-medium">{label}</span>
                </span>
                <span className="text-muted-foreground leading-snug">
                  {detail}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:sticky lg:top-24">
          <div className="grid gap-3">
            <LookupForm />
            <div className="grid gap-2 px-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                Try an example
              </p>
              <ul className="grid gap-1.5">
                {EXAMPLES.map((ex) => (
                  <li key={`${ex.name}@${ex.version}`}>
                    <Link
                      to={`/r/${ex.name}/${ex.version}`}
                      className="group flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/40 px-3 py-2 text-[13px] transition-colors hover:border-accent/60 hover:bg-card"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-[12.5px] tabular text-foreground">
                          {ex.name}
                          <span className="text-muted-foreground">@</span>
                          {ex.version}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {ex.note}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="size-3.5 -translate-x-0.5 text-muted-foreground transition-transform group-hover:translate-x-0 group-hover:text-foreground"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Printer's rule + a quiet promise. No card. Just spacing & type. */}
      <section
        aria-labelledby="promise-heading"
        className="grid gap-6 border-t border-border/70 pt-10"
      >
        <div className="grid gap-2 lg:max-w-[58ch]">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            How
          </p>
          <h2
            id="promise-heading"
            className="text-2xl font-semibold tracking-tight sm:text-[28px]"
          >
            No bundler-side trust. The proofs run on your machine.
          </h2>
        </div>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          The gateway uses WebCrypto (SHA-256), <code>@noble/curves</code>{' '}
          (Ed25519), a small POSIX <code>tar</code> reader, and direct Solana
          JSON-RPC calls. There is no Solana SDK and no Node runtime in the
          bundle. If verification fails for a release, the renderer never
          mounts.
        </p>
      </section>
    </div>
  );
}
