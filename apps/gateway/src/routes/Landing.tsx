import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Container } from '@/components/Layout';
import { LookupForm } from '@/components/LookupForm';

const PROOF_STEPS: ReadonlyArray<{
  index: string;
  label: string;
  detail: string;
}> = [
  {
    index: '01',
    label: 'On-chain content hash',
    detail:
      'The Solana release record carries a SHA-256 over the canonical file index. The manifest you fetch must match it byte-for-byte.',
  },
  {
    index: '02',
    label: 'Manifest signature',
    detail:
      'The publisher signs the canonical JSON manifest with their Solana key (Ed25519). We re-check the signature against the on-chain publisher.',
  },
  {
    index: '03',
    label: 'Per-file hashes',
    detail:
      'Each file is fetched on demand from its own content address and verified against the hash the publisher signed. If a single byte changes, that file does not render.',
  },
];

const EXAMPLES: ReadonlyArray<{ name: string; version: string; note: string }> =
  [
    {
      name: 'gutenberg',
      version: '1.0.0',
      note: 'project demo',
    },
  ];

const FAQ: ReadonlyArray<{ q: string; a: React.ReactNode }> = [
  {
    q: 'What can I publish?',
    a: (
      <>
        Anything that fits in files — markdown, images, PDFs, raw text,
        archives. Each file gets its own content-addressed Arweave upload.
        The gateway renders markdown directly and lets readers download
        other file types verbatim.
      </>
    ),
  },
  {
    q: 'Where is the content stored?',
    a: (
      <>
        On Arweave, addressed by content hash — each file individually. The
        Solana program stores publisher, version, manifest pointer, and a
        digest of the file index. Files survive any one host going away.
      </>
    ),
  },
  {
    q: 'Can a publisher revoke a release?',
    a: (
      <>
        No. The registry is append-only by design: there is no
        unpublish instruction. Once a release is recorded, the on-chain
        pointer (publisher, manifest URI, content hash) is permanent.
      </>
    ),
  },
  {
    q: 'What if a publisher key leaks?',
    a: (
      <>
        Old releases stay valid — they were signed by that key at that time.
        Future releases should be signed by a new key, registered to the same
        name only if the publisher controls the registry record.
      </>
    ),
  },
];

export function LandingRoute() {
  return (
    <div className="flex flex-col">
      {}
      <Container className="grid items-start gap-14 pb-24 pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-20 lg:pb-32 lg:pt-24">
        <div className="grid gap-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Gutenberg gateway
          </p>

          <h1 className="text-[2.5rem] font-semibold leading-none tracking-[-0.035em] text-foreground sm:text-[3.25rem] lg:text-[4.25rem]">
            Read what was actually published.
          </h1>

          <p className="max-w-[58ch] text-[16.5px] leading-[1.55] text-foreground-soft sm:text-[18px]">
            Open any release recorded on the Gutenberg registry. Your browser
            fetches the manifest and the bundle, recomputes every hash, and
            checks the publisher&apos;s signature before rendering a single
            byte.
          </p>

          <p className="text-[12.5px] text-muted-foreground">
            No SDKs in the bundle
            <Sep />
            No proxy or analytics
            <Sep />
            Just WebCrypto + RPC
          </p>
        </div>

        <div>
          <LookupForm />
          <div className="mt-5 px-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Try an example
            </p>
            <ul className="mt-3 grid gap-1.5">
              {EXAMPLES.map((ex) => (
                <li key={`${ex.name}@${ex.version}`}>
                  <Link
                    to={`/r/${ex.name}/${ex.version}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5 text-[13px] transition-colors hover:border-border-strong"
                  >
                    <span className="flex min-w-0 items-baseline gap-2 truncate">
                      <span className="truncate font-mono text-[12.5px] tabular text-foreground">
                        {ex.name}
                        <span className="text-muted-foreground">@</span>
                        {ex.version}
                      </span>
                      <span className="hidden text-[11.5px] text-muted-foreground sm:inline">
                        {ex.note}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      <Section eyebrow="01 / Why" title="Publishing should outlive its publisher.">
        <p className="max-w-[60ch] text-[16px] leading-[1.6] text-foreground-soft sm:text-[17px]">
          Whether you like it or not, governments and major outlets enforce a
          certain narrative. Work that contradicts it gets taken down, sued, or
          buried. Gutenberg lets you publish freely, privately, and
          permanently — content is written to durable storage and registered
          on a public chain, signed by the author. Once published, no host,
          editor, or court can censor the original.
        </p>

        <dl className="mt-10 grid divide-y divide-border border-y border-border text-[14.5px]">
          {[
            {
              k: 'Freely',
              v: 'No platform gatekeeper sits between writer and reader.',
            },
            {
              k: 'Privately',
              v: 'Only the publisher key can sign. Identity is a key, not a profile.',
            },
            {
              k: 'Permanently',
              v: 'Bundles live on Arweave. Signatures live on Solana. Either survives the other.',
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

      <Section eyebrow="02 / How" title="Three checks. All local.">
        <p className="max-w-[60ch] text-[16px] leading-[1.6] text-foreground-soft sm:text-[17px]">
          We do not proxy bundles, we do not import a Solana SDK, we do not
          re-host content. The verification runs entirely in your browser.
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
      </Section>

      <Section eyebrow="03 / Anatomy" title="What a release actually is.">
        <p className="max-w-[60ch] text-[16px] leading-[1.6] text-foreground-soft sm:text-[17px]">
          Every release decomposes into three small, replaceable artifacts.
          None of them depend on a particular host or app surviving.
        </p>

        <div className="mt-10">
          <ReleaseDiagram />
        </div>

        <dl className="mt-8 grid divide-y divide-border border-y border-border text-[14.5px]">
          {[
            {
              k: 'manifest.json',
              t: 'Canonical metadata',
              v: 'Name, version, entry path, file → {hash, size, ar:// uri}, content_hash, chain binding, publisher pubkey, Ed25519 signature.',
            },
            {
              k: 'ar://<txid> per file',
              t: 'Content archive',
              v: 'Each file uploaded individually to Arweave under its content address. Readers fetch only what they actually open.',
            },
            {
              k: 'release PDA',
              t: 'On-chain record',
              v: 'An append-only Solana account at (name, version) carrying publisher, content_hash, content_size, and the manifest pointer.',
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

      <Section eyebrow="04 / Stack" title="The whole verifier ships in the page.">
        <p className="max-w-[64ch] text-[16px] leading-[1.6] text-foreground-soft sm:text-[17px]">
          The gateway uses <Code>WebCrypto</Code> for SHA-256, the small{' '}
          <Code>@noble/curves</Code> library for Ed25519, and direct Solana{' '}
          <Code>JSON-RPC</Code> calls. There is no Solana SDK and no Node
          runtime in the bundle. Files are fetched lazily — only the page you
          read crosses the wire — and each is hashed against the manifest
          before it renders.
        </p>
      </Section>

      <Section eyebrow="05 / FAQ" title="Things people ask.">
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

function Sep() {
  return <span className="mx-2 text-muted-foreground/50">·</span>;
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
          gutenberg<span className="text-muted-foreground">@</span>1.0.0
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
