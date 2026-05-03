import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { LookupDialog } from '@/components/LookupDialog';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Wordmark } from '@/components/Wordmark';
import { cn } from '@/lib/utils';

export function SiteHeader() {
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
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 lg:gap-4 lg:px-10">
          <Link
            to="/"
            aria-label="Gutenberg gateway, home"
            className="group inline-flex shrink-0 items-baseline outline-none transition-opacity focus-visible:opacity-80"
          >
            <Wordmark className="text-[17px] text-foreground sm:text-[19px]" />
          </Link>

          <NavLink
            to="/publish"
            className={({ isActive }) =>
              cn(
                'registry-command-shell shrink-0 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors sm:hidden',
                isActive
                  ? 'border-primary/45 bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:border-border-strong hover:text-foreground',
              )
            }
          >
            [ publish ]
          </NavLink>

          <nav
            aria-label="Primary"
            className="hidden items-center font-mono text-[10px] uppercase tracking-[0.2em] sm:flex"
          >
            <HeaderLink to="/browse">[ browse ]</HeaderLink>
            <HeaderLink to="/search">[ search ]</HeaderLink>
            <HeaderLink to="/publish" emphasis="high">
              [ publish ]
            </HeaderLink>
          </nav>

          <div className="ms-auto flex shrink-0 items-center">
            <ConnectWalletButton
              variant="outline"
              className="registry-command-shell h-9 shrink-0 px-2.5 text-[11px] font-mono uppercase tracking-[0.14em] hover:border-border-strong hover:bg-elevated sm:px-3 sm:text-[12px]"
            />
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
  emphasis = 'default',
}: {
  to: string;
  children: React.ReactNode;
  emphasis?: 'default' | 'high';
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group relative px-2.5 py-1.5 transition-colors',
          isActive
            ? 'text-foreground'
            : emphasis === 'high'
              ? 'text-foreground-soft hover:text-foreground'
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
