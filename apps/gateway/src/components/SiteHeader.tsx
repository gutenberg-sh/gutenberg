import { Github, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { LookupDialog } from '@/components/LookupDialog';
import { Wordmark } from '@/components/Wordmark';
import { useIsApplePlatform } from '@/hooks/usePlatform';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const is_mac = useIsApplePlatform();
  const [lookup_open, set_lookup_open] = useState(false);

  useEffect(() => {
    function on_keydown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        set_lookup_open((current) => !current);
      }
    }
    window.addEventListener('keydown', on_keydown);
    return () => window.removeEventListener('keydown', on_keydown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/65 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3 lg:px-10">
          <Link
            to="/"
            aria-label="Gutenberg gateway, home"
            className="group inline-flex shrink-0 items-baseline outline-none transition-opacity focus-visible:opacity-80"
          >
            <Wordmark className="text-[14px] text-foreground" />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 sm:flex"
          >
            <HeaderLink to="/browse">Browse</HeaderLink>
            <HeaderLink to="/search">Search</HeaderLink>
          </nav>

          <div className="ml-auto flex items-center gap-2 text-[13px]">
            <button
              type="button"
              onClick={() => set_lookup_open(true)}
              aria-label="Search the registry"
              className="hidden items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground-soft transition-colors hover:border-border-strong hover:bg-elevated hover:text-foreground sm:inline-flex"
            >
              <Search className="size-3.5" strokeWidth={1.85} aria-hidden />
              <span className="text-[12.5px]">Search</span>
              <span className="flex items-center gap-0.5">
                <span className="kbd">{is_mac ? '⌘' : 'Ctrl'}</span>
                <span className="kbd">K</span>
              </span>
            </button>

            <a
              href="https://github.com/leonmeka/gutenberg"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Project source on GitHub"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Github className="size-4" strokeWidth={1.75} aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <LookupDialog open={lookup_open} on_open_change={set_lookup_open} />
    </>
  );
}

function HeaderLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group relative rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {children}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-x-2.5 bottom-[3px] h-[2px] origin-center rounded-full transition-all',
              isActive
                ? 'scale-x-100 bg-accent opacity-100'
                : 'scale-x-50 bg-foreground/40 opacity-0 group-hover:scale-x-100 group-hover:opacity-30',
            )}
          />
        </>
      )}
    </NavLink>
  );
}
