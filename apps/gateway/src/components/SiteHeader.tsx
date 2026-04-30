import { Link, useLocation } from 'react-router-dom';

import { Wordmark } from '@/components/Wordmark';
import { cn } from '@/lib/utils';

const NAV: Array<{ label: string; href: string; external?: boolean }> = [
  { label: 'Lookup', href: '/' },
  {
    label: 'Source',
    href: 'https://github.com/',
    external: true,
  },
];

export function SiteHeader() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-3.5 lg:px-10">
        <Link
          to="/"
          className="group inline-flex items-baseline outline-none transition-opacity focus-visible:opacity-80"
          aria-label="Gutenberg gateway, home"
        >
          <Wordmark className="text-[15px] text-foreground" />
        </Link>

        <nav
          aria-label="Primary"
          className="flex items-center gap-1 text-[13px]"
        >
          {NAV.map((item) => {
            const active =
              !item.external &&
              (item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href));

            const className = cn(
              'rounded-md px-2.5 py-1.5 transition-colors',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            );

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={className}
                >
                  {item.label}
                </a>
              );
            }

            return (
              <Link key={item.href} to={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Single-pixel hairline accent under header to suggest a printer's rule. */}
      <div
        aria-hidden
        className="h-px w-full bg-gradient-to-r from-transparent via-foreground/12 to-transparent"
      />
    </header>
  );
}
