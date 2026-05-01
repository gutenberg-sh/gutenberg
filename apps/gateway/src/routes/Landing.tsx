import { Link } from 'react-router-dom';

import { Container } from '@/components/Layout';
import { LookupForm } from '@/components/LookupForm';
import { RecentReleases } from '@/components/RecentReleases';
import { format_count } from '@/lib/format';
import { useIndexerStats } from '@/lib/queries';
import { cn } from '@/lib/utils';

const PROOF_STEPS: ReadonlyArray<{
  index: string;
  label: string;
  detail: string;
}> = [
  {
    index: '01',
    label: 'Who published it',
    detail:
      'The publisher signs every release with a key only they hold. Your browser checks that signature against the public key the chain has on record.',
  },
  {
    index: '02',
    label: 'What was published',
    detail:
      'The chain stores a fingerprint of the whole release. The files your browser fetches have to match that fingerprint exactly — every byte.',
  },
  {
    index: '03',
    label: 'What you\u2019re reading right now',
    detail:
      'Every file has its own fingerprint too. If a single byte differs from the one the author signed, the file refuses to render.',
  },
];

const FAQ: ReadonlyArray<{ q: string; a: React.ReactNode }> = [
  {
    q: 'Who can take a release down?',
    a: (
      <>
        No one. There is no unpublish button — not for us, not for the
        publisher, not for a court. Once a release is signed and recorded,
        the original is permanent.
      </>
    ),
  },
  {
    q: 'How do I know what I\u2019m reading is real?',
    a: (
      <>
        Every page on this site verifies itself in your browser before it
        renders. The signature, the file fingerprints, and the on-chain
        record all have to line up. If anything is off, the page refuses
        to load.
      </>
    ),
  },
  {
    q: 'What can I publish?',
    a: (
      <>
        Anything that fits in a folder — writing, photos, PDFs, archives,
        whatever. Markdown renders directly here; everything else is served
        byte-for-byte the way you uploaded it.
      </>
    ),
  },
  {
    q: 'How do I publish?',
    a: (
      <>
        Install the <Code>gutenberg</Code> CLI, point it at your folder, and
        run <Code>gutenberg publish</Code>. It opens this site, your wallet
        signs the release, and your terminal hands you back the URL. See the{' '}
        <a
          href="https://github.com/itsmekamal/gutenberg"
          target="_blank"
          rel="noreferrer noopener"
          className="text-foreground underline-offset-4 hover:underline"
        >
          repository
        </a>{' '}
        for setup.
      </>
    ),
  },
  {
    q: 'What if a publisher loses their key?',
    a: (
      <>
        Old releases stay valid — they were signed by that key at that time,
        and that fact is permanent. Anything new has to come from a new key,
        and readers can see the change.
      </>
    ),
  },
  {
    q: 'Is the verifier open?',
    a: (
      <>
        Yes. The whole site, the CLI, and the on-chain program are open
        source. The verifier ships in this page — you can read it, audit it,
        or run it yourself.
      </>
    ),
  },
];

export function LandingRoute() {
  return (
    <div className="flex flex-col">
      {}
      <Container className="pb-20 pt-14 lg:pb-28 lg:pt-20">
        <div className="grid gap-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Gutenberg · publish freely. read what&rsquo;s real.
          </p>
          <h1 className="text-[2.25rem] font-semibold leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[2.875rem] lg:text-[3.5rem]">
            Publish what can&rsquo;t be erased.
          </h1>
          <p className="max-w-[60ch] text-[15.5px] leading-[1.55] text-foreground-soft sm:text-[16.5px]">
            Gutenberg is where anyone can publish freely, privately, and
            permanently. Once a release goes up, no host, court, or platform
            can take it down — and every reader can see, in their own browser,
            that what they&rsquo;re reading is the original.
          </p>
        </div>

        {}
        <div className="mt-9 max-w-3xl">
          <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
              Search the registry
            </p>
            <p className="hidden text-[11.5px] text-muted-foreground sm:block">
              <span className="font-mono tabular text-foreground-soft">
                ⌘K
              </span>{' '}
              anywhere
            </p>
          </div>
          <LookupForm size="lg" placeholder="find a release or publisher" />
        </div>

        <StatsStrip />
      </Container>

      <Container as="section" className="border-t border-border py-14 lg:py-20">
        <RecentReleases limit={8} />
      </Container>

      <Section eyebrow="01 / Why" title="Publishing should outlive its publisher.">
        <p className="max-w-[60ch] text-[16px] leading-[1.6] text-foreground-soft sm:text-[17px]">
          Most of what you read today lives on someone else&rsquo;s servers.
          That someone can take it down, edit it after the fact, or quietly
          de-rank it until it&rsquo;s gone. Governments and major platforms
          do this constantly — and most of the time you&rsquo;ll never know
          it happened.
        </p>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.6] text-foreground-soft sm:text-[17px]">
          Gutenberg makes that impossible. The author signs the work with
          their own key, the files go to storage no single company controls,
          and the record lives on a public chain. Once it&rsquo;s up, the
          original is permanent. No host, editor, or court can revoke it.
        </p>

        <dl className="mt-10 grid divide-y divide-border border-y border-border text-[14.5px]">
          {[
            {
              k: 'Freely',
              v: 'No platform decides who gets to publish. If you can sign, you can publish.',
            },
            {
              k: 'Privately',
              v: 'Your identity is a key, not a profile. Nothing connects your release to your name unless you do.',
            },
            {
              k: 'Permanently',
              v: 'Files live on Arweave. The signed record lives on Solana. Either outlasts the other.',
            },
          ].map((row) => (
            <div
              key={row.k}
              className="grid items-baseline gap-4 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-10"
            >
              <dt className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {row.k}
              </dt>
              <dd className="text-foreground">{row.v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section eyebrow="02 / Proof" title="How you know it&rsquo;s the original.">
        <p className="max-w-[60ch] text-[16px] leading-[1.6] text-foreground-soft sm:text-[17px]">
          Anyone can claim a page is real. Gutenberg lets your own browser
          prove it. Every release carries a signature from its author and a
          fingerprint on chain — and your browser checks both before showing
          you a single word.
        </p>

        <ol className="mt-10 grid divide-y divide-border border-y border-border">
          {PROOF_STEPS.map(({ index, label, detail }) => (
            <li
              key={index}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-5 py-6 sm:gap-10"
            >
              <span className="font-mono text-[12px] tabular text-muted-foreground">
                {index}
              </span>
              <div className="grid gap-2">
                <h3 className="text-[17px] font-medium tracking-[-0.005em] text-foreground sm:text-[18px]">
                  {label}
                </h3>
                <p className="max-w-[62ch] text-[14.5px] leading-[1.6] text-foreground-soft">
                  {detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 max-w-[60ch] text-[13.5px] leading-[1.6] text-muted-foreground">
          We don&rsquo;t proxy releases. We don&rsquo;t re-host content. There
          is nothing on our side you have to trust — including us.
        </p>
      </Section>

      <Section eyebrow="03 / Permanence" title="Built to outlast any one of us.">
        <p className="max-w-[60ch] text-[16px] leading-[1.6] text-foreground-soft sm:text-[17px]">
          A release isn&rsquo;t a webpage on a server someone can shut down.
          It&rsquo;s three small, independent pieces that live on networks no
          one company controls.
        </p>

        <div className="mt-10">
          <ReleaseDiagram />
        </div>

        <dl className="mt-8 grid divide-y divide-border border-y border-border text-[14.5px]">
          {[
            {
              k: 'manifest.json',
              t: 'The signed index',
              v: "Lists every file in the release, what's in it, and who signed it. Small, human-readable, signed by the author.",
            },
            {
              k: 'ar://<txid>',
              t: 'The files themselves',
              v: 'Every file lives on Arweave under its own content address. Your browser only fetches what you actually open.',
            },
            {
              k: 'solana://release',
              t: 'The on-chain record',
              v: "Solana stores a permanent pointer at name + version: who published it, and what the manifest is supposed to look like.",
            },
          ].map((row) => (
            <div
              key={row.k}
              className="grid items-baseline gap-3 py-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-10"
            >
              <dt className="grid gap-1">
                <span className="font-mono text-[12.5px] tabular text-foreground">
                  {row.k}
                </span>
                <span className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  {row.t}
                </span>
              </dt>
              <dd className="text-foreground-soft">{row.v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section eyebrow="04 / FAQ" title="Things people ask.">
        <dl className="grid divide-y divide-border border-y border-border">
          {FAQ.map(({ q, a }) => (
            <div
              key={q}
              className="grid items-baseline gap-3 py-7 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] sm:gap-10"
            >
              <dt className="text-[16.5px] font-medium tracking-[-0.005em] text-foreground sm:text-[17.5px]">
                {q}
              </dt>
              <dd className="max-w-[62ch] text-[14.5px] leading-[1.65] text-foreground-soft">
                {a}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Container as="section" className="border-t border-border py-20 lg:py-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] lg:gap-16">
        <div className="grid content-start gap-5 lg:sticky lg:top-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[36px] lg:text-[44px]">
            {title}
          </h2>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

function StatsStrip() {
  const stats = useIndexerStats();

  const items: ReadonlyArray<{
    key: 'releases' | 'names' | 'publishers';
    label: string;
    href: string;
  }> = [
    { key: 'releases', label: 'releases', href: '/browse' },
    { key: 'names', label: 'names', href: '/search' },
    { key: 'publishers', label: 'publishers', href: '/search' },
  ];

  const ready = stats.isSuccess && !!stats.data;

  return (
    <dl
      aria-label="Registry totals"
      className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px]"
    >
      {items.map((it, idx) => {
        const value = ready ? stats.data?.[it.key] ?? 0 : null;
        return (
          <Link
            key={it.key}
            to={it.href}
            className="group inline-flex items-baseline gap-2"
          >
            <dt className="sr-only">{it.label}</dt>
            <dd
              className={cn(
                'font-mono text-[20px] tabular leading-none text-foreground transition-colors group-hover:text-foreground sm:text-[22px]',
                ready ? '' : 'text-muted-foreground/40',
              )}
            >
              {ready ? format_count(value) : '···'}
            </dd>
            <span className="text-[12px] text-muted-foreground transition-colors group-hover:text-foreground-soft">
              {it.label}
            </span>
            {idx < items.length - 1 ? (
              <span aria-hidden className="ml-6 text-muted-foreground/30">
                ·
              </span>
            ) : null}
          </Link>
        );
      })}
    </dl>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[0.85em] tabular text-foreground">
      {children}
    </code>
  );
}

function ReleaseDiagram() {
  return (
    <div className="ring-hairline relative overflow-hidden rounded-2xl bg-card p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="font-mono text-[11.5px] tabular text-foreground">
          gutenberg-demo<span className="text-muted-foreground">@</span>1.0.0
        </span>
        <span className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Schematic
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.85fr)] sm:items-stretch sm:gap-0">
        <div className="grid content-between gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11.5px] tabular text-foreground">
              files (per-file ar://)
            </span>
            <span className="font-mono text-[10.5px] tabular text-muted-foreground">
              SHA-256
            </span>
          </div>
          <ul className="grid gap-1 font-mono text-[11.5px] tabular text-foreground-soft">
            <li>/index.md ↦ ar://abc…</li>
            <li>/about.md ↦ ar://def…</li>
            <li>/assets/cover.png ↦ ar://ghi…</li>
            <li className="text-muted-foreground">…</li>
          </ul>
        </div>

        <div className="hidden items-center justify-center px-4 sm:flex">
          <Connector />
        </div>
        <div className="flex items-center justify-center py-2 sm:hidden">
          <Connector vertical />
        </div>

        <div className="grid gap-3">
          <div className="grid gap-2 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11.5px] tabular text-foreground">
                manifest.json
              </span>
              <span className="font-mono text-[10.5px] tabular text-muted-foreground">
                Ed25519
              </span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed tabular text-foreground-soft">
              <span className="text-muted-foreground">name</span>: gutenberg
              <br />
              <span className="text-muted-foreground">version</span>: 1.0.0
              <br />
              <span className="text-muted-foreground">entry</span>: /index.md
              <br />
              <span className="text-muted-foreground">files</span>:{' '}
              <span className="text-muted-foreground/80">
                {'{'}path: {'{'}hash, size, uri{'}'}…{'}'}
              </span>
              <br />
              <span className="text-muted-foreground">content_hash</span>:
              sha256:…
              <br />
              <span className="text-muted-foreground">chain</span>: solana:…
              <br />
              <span className="text-foreground">sig</span>: ed25519:…
            </p>
          </div>
          <div className="grid gap-1 rounded-xl border border-border px-4 py-3">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Solana PDA
            </span>
            <span className="truncate font-mono text-[11.5px] tabular text-foreground">
              [&apos;release&apos;, sha256(&apos;gutenberg&apos;),
              sha256(&apos;1.0.0&apos;)]
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Connector({ vertical = false }: { vertical?: boolean }) {
  if (vertical) {
    return (
      <svg
        viewBox="0 0 16 32"
        className="h-8 w-4 text-border-strong"
        aria-hidden
      >
        <path
          d="M8 0 V32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 16" className="h-4 w-16 text-border-strong" aria-hidden>
      <path d="M0 8 H64" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
