import { Github, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { LookupDialog } from '@/components/LookupDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
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
      <header className="sticky top-0 z-40 border-b-2 border-border bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 lg:px-10">
          <Link
            to="/"
            aria-label="Gutenberg gateway, home"
            className="group inline-flex shrink-0 items-baseline outline-none transition-opacity focus-visible:opacity-80"
          >
            <Wordmark className="text-[13px] text-foreground" />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center font-mono text-[10px] uppercase tracking-[0.2em] sm:flex"
          >
            <HeaderLink to="/browse">[ browse ]</HeaderLink>
            <HeaderLink to="/search">[ search ]</HeaderLink>
          </nav>

          <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
            <button
              type="button"
              onClick={() => set_lookup_open(true)}
              aria-label="Search packages and releases"
              className="registry-command-shell flex w-full max-w-xl items-center gap-2.5 px-3 py-2 text-left font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Search className="size-3.5 shrink-0" strokeWidth={1.85} aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                &gt; query registry · spec{' '}
                <span className="text-foreground-soft">
                  name@version
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-0.5 sm:flex">
                <span className="kbd">{is_mac ? '⌘' : 'Ctrl'}</span>
                <span className="kbd">K</span>
              </span>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1.5 text-[13px] sm:gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => set_lookup_open(true)}
              aria-label="Open search"
              className="inline-flex size-9 items-center justify-center rounded-none border border-border bg-card text-foreground-soft transition-colors hover:border-border-strong hover:bg-elevated hover:text-foreground md:hidden"
            >
              <Search className="size-4" strokeWidth={1.85} aria-hidden />
            </button>

            <a
              href="https://github.com/leonmeka/gutenberg"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Project source on GitHub"
              className="inline-flex size-9 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
          'group relative px-2.5 py-1.5 transition-colors',
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
              'pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-center transition-all',
              isActive
                ? 'scale-x-100 bg-accent opacity-100'
                : 'scale-x-0 bg-foreground/50 opacity-0 group-hover:scale-x-100 group-hover:opacity-100',
            )}
          />
        </>
      )}
    </NavLink>
  );
}
