import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { LookupDialog } from '@/components/LookupDialog';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Wordmark } from '@/components/Wordmark';
import { registry_command_shell } from '@/lib/registry-surface';
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
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
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
                registry_command_shell,
                'shrink-0 px-3 py-1.5 text-[13px] font-medium transition-[color,background-color,border-color,box-shadow] duration-200 ease-out sm:hidden',
                isActive
                  ? 'border-primary/35 bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:border-border-strong hover:bg-elevated/60 hover:text-foreground',
              )
            }
          >
            Publish
          </NavLink>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-0.5 text-[13px] font-medium sm:flex"
          >
            <HeaderLink to="/browse">Browse</HeaderLink>
            <HeaderLink to="/search">Search</HeaderLink>
            <HeaderLink to="/publish" emphasis="high">
              Publish
            </HeaderLink>
          </nav>

          <div className="ms-auto flex shrink-0 items-center">
            <ConnectWalletButton
              variant="outline"
              className={cn(
                registry_command_shell,
                'h-9 shrink-0 px-3 text-[12px] font-medium transition-[color,background-color,border-color,box-shadow] duration-200 ease-out hover:border-border-strong hover:bg-elevated sm:px-3.5',
              )}
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
          'group relative rounded-md px-3 py-2 transition-colors duration-200 ease-out',
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
              'pointer-events-none absolute inset-x-1 bottom-0.5 h-px origin-center rounded-full transition-all duration-200 ease-out',
              isActive
                ? 'scale-x-100 bg-primary opacity-100'
                : 'scale-x-0 bg-foreground/35 opacity-0 group-hover:scale-x-100 group-hover:opacity-100',
            )}
          />
        </>
      )}
    </NavLink>
  );
}
