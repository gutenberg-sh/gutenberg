import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundRoute() {
  return (
    <section className="grid items-center gap-12 border-y border-border/70 py-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20 lg:py-24">
      <div className="grid gap-6">
        <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-destructive/70"
          />
          404 · No such page
        </p>
        <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[48px]">
          That URL doesn&apos;t resolve.
        </h1>
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
          Releases are addressed as{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">
            /r/&lt;name&gt;/&lt;version&gt;
          </code>
          . If you typed the path by hand, double-check the name and version,
          then try again from the lookup page.
        </p>
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-all hover:bg-foreground/92 active:translate-y-[1px] active:scale-[0.985]"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden />
            Back to lookup
          </Link>
        </div>
      </div>

      <p
        aria-hidden
        className="font-serif text-[clamp(120px,18vw,200px)] leading-none tracking-[-0.04em] text-foreground/[0.06] select-none italic"
      >
        404
      </p>
    </section>
  );
}
