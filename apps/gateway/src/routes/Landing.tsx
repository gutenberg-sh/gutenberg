import { Link } from 'react-router-dom';

import { Container } from '@/components/Layout';
import { LookupForm } from '@/components/LookupForm';
import { RecentReleases } from '@/components/RecentReleases';
import { format_count } from '@/lib/format';
import { useIndexerStats } from '@/lib/queries';
import { registry_command_shell } from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

const FAQ: ReadonlyArray<{ q: string; a: React.ReactNode }> = [
  {
    q: 'Who can take a publication down?',
    a: (
      <>
        No one — not you, not us, not the person who published it. Once a
        publication is signed and recorded, that signed version stays.
      </>
    ),
  },
  {
    q: 'How do I know what I\u2019m reading is real?',
    a: (
      <>
        Each publication is signed and anchored on-chain. Change the stored
        bundle without updating the record and readers hit errors — not a silent
        substitute.
      </>
    ),
  },
  {
    q: 'What can I publish?',
    a: (
      <>
        Whatever fits in a folder: writing, images, PDFs, archives. Markdown
        shows here as pages; everything else comes down exactly as you uploaded
        it.
      </>
    ),
  },
  {
    q: 'How do I publish?',
    a: (
      <>
        Open{' '}
        <Link
          to="/publish"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Publish
        </Link>
        , add a folder, files, or a zip, then connect your wallet and confirm
        costs before you sign. See the{' '}
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
        If you lose your key, old publications still count for what they were.
        Anything new needs a new key — readers see the break.
      </>
    ),
  },
  {
    q: 'Is the code open?',
    a: (
      <>
        Yes — this site and the on-chain program live in the{' '}
        <a
          href="https://github.com/itsmekamal/gutenberg"
          target="_blank"
          rel="noreferrer noopener"
          className="text-foreground underline-offset-4 hover:underline"
        >
          repository
        </a>
        .
      </>
    ),
  },
];

export function LandingRoute() {
  return (
    <div className="flex flex-col">
      <Container className="pb-20 pt-14 sm:pb-24 sm:pt-18 lg:pb-14 lg:pt-22">
        <div className="grid gap-9 lg:gap-11">
          <div className="grid gap-10 lg:min-h-[min(36svh,480px)] lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.92fr)] lg:items-start lg:gap-x-16 lg:gap-y-8">
            <div className="grid max-w-xl content-start gap-6 self-start sm:max-w-none">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                Solana registry
              </p>
              <h1
                className={cn(
                  'max-w-[min(24ch,90vw)] text-3xl font-medium leading-[108%] tracking-[-0.03em]',
                  'text-foreground/88 [text-shadow:0_1px_0_rgba(255,255,255,0.32)]',
                  'dark:text-foreground dark:[text-shadow:0_1px_0_#1f1f1f]',
                  'md:text-[42px]',
                )}
              >
                Publish work that stays public.
              </h1>
              <p
                className={cn(
                  'max-w-[min(40ch,22rem)] text-base font-medium leading-[138%] tracking-[-0.03em]',
                  'text-muted-foreground md:text-lg',
                )}
              >
                Anyone can publish; once it&rsquo;s on the record, nobody can
                unpublish it.
              </p>
              <p className="max-w-md text-[11px] font-medium leading-snug tracking-wide text-muted-foreground sm:text-[12px]">
                {['Signed release', 'On-chain record', 'Reader-verified'].map(
                  (label, i) => (
                    <span key={label} className="inline whitespace-nowrap">
                      {i > 0 ? (
                        <span
                          aria-hidden
                          className="select-none px-1.5 text-border-strong/55 sm:px-2"
                        >
                          ·
                        </span>
                      ) : null}
                      {label}
                    </span>
                  ),
                )}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
                <Link
                  to="/publish"
                  className="inline-flex w-full min-h-11 items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2.5 text-[13px] font-semibold leading-tight text-primary-foreground shadow-sm transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-primary/90 hover:shadow active:translate-y-px active:scale-[0.99] sm:w-auto sm:px-5 sm:text-[14px]"
                >
                  Publish a release
                </Link>
                <Link
                  to="/browse"
                  className={cn(
                    registry_command_shell,
                    'inline-flex w-full min-h-11 items-center justify-center px-4 py-2.5 text-[13px] font-medium leading-tight text-foreground-soft transition-[color,border-color,background-color,box-shadow] duration-200 ease-out hover:border-border-strong hover:bg-elevated/50 hover:text-foreground sm:w-auto sm:px-5 sm:text-[14px]',
                  )}
                >
                  Browse publications
                </Link>
              </div>
            </div>

            <div className="grid w-full gap-2.5 sm:gap-3 lg:self-center">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                Find a publication
              </p>
              <LookupForm size="lg" placeholder="registry id or id@version" />
            </div>
          </div>

          <StatsStrip embedded />
        </div>
      </Container>

      <Container as="section" className="border-t border-border py-14 lg:py-20">
        <RecentReleases limit={8} />
      </Container>

      <Section
        eyebrow="01 / Why"
        title="Your reading shouldn&rsquo;t depend on someone else&rsquo;s mood."
      >
        <p className="max-w-[60ch] text-[16px] leading-[1.7] text-foreground-soft sm:text-[17px]">
          Most of what you read lives on someone else&rsquo;s computer. They can
          pull it, rewrite it in place, or let it sink — often without telling
          you.
        </p>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-foreground-soft sm:text-[17px]">
          On Gutenberg you choose what to publish. Once it is signed onto the
          record, nobody can censor that publication for you: no institution, no
          government or court.
        </p>

        <dl className="mt-10 grid divide-y divide-border border-y border-border text-[14.5px]">
          {[
            {
              k: 'Freely',
              v: 'You don\u2019t wait on us to approve a publication.',
            },
            {
              k: 'Privately',
              v: 'You\u2019re a key, not a profile — tie it to your name only if you want.',
            },
            {
              k: 'Permanently',
              v: 'What you published outlasts any one site or company.',
            },
          ].map((row) => (
            <div
              key={row.k}
              className="grid items-baseline gap-4 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-10"
            >
              <dt className="text-sm font-semibold text-foreground-soft">
                {row.k}
              </dt>
              <dd className="text-foreground leading-[1.68]">{row.v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        eyebrow="02 / Permanence"
        title="Where your publication lives without asking us to stay up."
      >
        <p className="max-w-[60ch] text-[16px] leading-[1.7] text-foreground-soft sm:text-[17px]">
          Your publication isn&rsquo;t one fragile website we could turn off.
          It&rsquo;s split so no single outfit flips the switch alone.
        </p>

        <div className="mt-10">
          <ReleaseDiagram />
        </div>

        <p className="mt-8 max-w-[60ch] text-[13.5px] leading-[1.7] text-muted-foreground">
          Release pages reconcile fetched files with the signed manifest and
          on-chain slot before rendering; hashes and keys are under Provenance
          when you want them.
        </p>

        <dl className="mt-8 grid divide-y divide-border border-y border-border text-[14.5px]">
          {[
            {
              k: 'manifest.json',
              t: 'The signed index',
              v: 'Your signed table of contents — paths, sizes, who signed the bundle.',
            },
            {
              k: 'ar://<txid>',
              t: 'The files themselves',
              v: 'Your files at fixed addresses; clients fetch only what you open.',
            },
            {
              k: 'solana://release',
              t: 'The public record',
              v: 'The slot for registry id + version — who published and what the bundle must match.',
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
                <span className="text-xs font-medium text-muted-foreground">
                  {row.t}
                </span>
              </dt>
              <dd className="text-foreground-soft leading-[1.68]">{row.v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 max-w-[60ch] text-[13.5px] leading-[1.7] text-muted-foreground">
          Narrow registry plumbing — not law, not moderation, not a verdict on
          what belongs online.
        </p>
      </Section>

      <Section eyebrow="03 / FAQ" title="Questions.">
        <dl className="grid divide-y divide-border border-y border-border">
          {FAQ.map(({ q, a }) => (
            <div
              key={q}
              className="grid items-baseline gap-3 py-7 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] sm:gap-10"
            >
              <dt
                id={q === 'How do I publish?' ? 'web-publish' : undefined}
                className={cn(
                  'text-[16.5px] font-medium tracking-[-0.005em] text-foreground sm:text-[17.5px]',
                  q === 'How do I publish?' && 'scroll-mt-28',
                )}
              >
                {q}
              </dt>
              <dd className="max-w-[62ch] text-[14.5px] leading-[1.72] text-foreground-soft">
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
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="tactical-display text-[clamp(1.25rem,4.5vw,2.5rem)] text-foreground">
            {title}
          </h2>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

function StatsStrip({ embedded = false }: { embedded?: boolean }) {
  const stats = useIndexerStats();

  const items: ReadonlyArray<{
    key: 'releases' | 'publications' | 'publishers';
    label: string;
    href: string;
  }> = [
    { key: 'releases', label: 'releases', href: '/browse' },
    { key: 'publications', label: 'publications', href: '/browse' },
    { key: 'publishers', label: 'publishers', href: '/browse' },
  ];

  const ready = stats.isSuccess && !!stats.data;

  return (
    <nav
      aria-label="Registry totals"
      className={cn(
        embedded
          ? 'border-t border-border/50 pt-8 sm:pt-9'
          : 'mt-8 border-t border-border/30 pt-8 sm:mt-10 sm:pt-10',
      )}
    >
      <ul className="grid grid-cols-3 divide-x divide-border/25 text-[13px]">
        {items.map((it) => {
          const value = ready ? (stats.data?.[it.key] ?? 0) : null;
          return (
            <li key={it.key} className="min-w-0">
              <Link
                to={it.href}
                className="group flex min-h-18 flex-col items-center justify-center gap-1 px-1.5 py-2 text-center sm:min-h-0 sm:gap-1.5 sm:px-3 sm:py-3"
              >
                <span
                  className={cn(
                    'text-[clamp(1.125rem,4.5vw,1.375rem)] font-semibold tabular-nums leading-none tracking-tight text-foreground transition-colors group-hover:text-foreground sm:text-[22px]',
                    ready ? '' : 'text-muted-foreground/45',
                  )}
                >
                  {ready ? format_count(value) : '···'}
                </span>
                <span className="px-0.5 text-center text-[10.5px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground-soft sm:text-[12px] sm:leading-snug">
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ReleaseDiagram() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/55 bg-muted/35 p-5 sm:p-7 dark:border-border/70 dark:bg-card/25">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/35 pb-4 dark:border-border/50">
        <span className="font-mono text-[11.5px] tabular text-foreground">
          gutenberg-demo<span className="text-muted-foreground">@</span>1.0.0
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Schematic
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.85fr)] sm:items-stretch sm:gap-0">
        <div className="grid content-between gap-3 rounded-lg border border-border/50 bg-background/55 p-4 dark:border-border/55 dark:bg-elevated/25">
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
          <div className="grid gap-2 rounded-lg border border-border/50 bg-background/55 p-4 dark:border-border/55 dark:bg-elevated/25">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11.5px] tabular text-foreground">
                manifest.json
              </span>
              <span className="font-mono text-[10.5px] tabular text-muted-foreground">
                Ed25519
              </span>
            </div>
            <p className="font-mono text-[11px] leading-[1.65] tabular text-foreground-soft">
              <span className="text-muted-foreground">registry_id</span>:
              gutenberg
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
          <div className="grid gap-1 rounded-lg border border-border/50 bg-background/55 px-4 py-3 dark:border-border/55 dark:bg-elevated/25">
            <span className="text-xs font-medium text-muted-foreground">
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
    <svg
      viewBox="0 0 64 16"
      className="h-4 w-16 text-border-strong"
      aria-hidden
    >
      <path d="M0 8 H64" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
