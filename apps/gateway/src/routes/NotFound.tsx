import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Container } from '@/components/Layout';
import { useIsApplePlatform } from '@/hooks/usePlatform';

export function NotFoundRoute() {
  const is_mac = useIsApplePlatform();

  return (
    <Container as="section" className="grid gap-7 py-24 lg:py-32">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        404 / Not found
      </p>
      <h1 className="text-[2.25rem] font-semibold leading-[1.12] tracking-[-0.034em] text-foreground sm:text-[3rem] lg:text-[3.5rem]">
        That URL doesn&apos;t resolve.
      </h1>
      <p className="max-w-[58ch] text-[16px] leading-[1.7] text-foreground-soft sm:text-[17px]">
        Releases live at{' '}
        <code className="rounded-none border border-border bg-card px-1.5 py-0.5 font-mono text-[13px] tabular text-foreground">
          /r/&lt;name&gt;/&lt;version&gt;
        </code>
        . Double-check both, then try again from search.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-none bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden />
          Back to search
        </Link>
        <span className="hidden items-center gap-1.5 text-[12px] text-muted-foreground sm:inline-flex">
          or press
          <span className="kbd">{is_mac ? '⌘' : 'Ctrl'}</span>
          <span className="kbd">K</span>
        </span>
      </div>
    </Container>
  );
}
