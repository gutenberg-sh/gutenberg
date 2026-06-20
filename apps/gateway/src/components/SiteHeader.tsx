import { Link, NavLink } from 'react-router-dom';

import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Wordmark } from '@/components/Wordmark';
import { registry_command_shell, registry_shell_x } from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/55 bg-surface dark:border-border/80 dark:bg-background">
        <div className={cn('mx-auto flex w-full max-w-[1332px] items-center gap-2 py-2.5 sm:gap-3 lg:gap-4', registry_shell_x)}>
          <Link
            to="/"
            aria-label="Gutenberg, home"
            className="group inline-flex shrink-0 items-center outline-none transition-opacity focus-visible:opacity-80"
          >
            <Wordmark className="text-[17px] text-foreground sm:text-[19px]" showSubmark={false} />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden h-9 items-center gap-0.5 text-[13px] font-medium sm:flex"
          >
            <HeaderLink to="/browse">Browse</HeaderLink>
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
          'group relative flex h-9 items-center rounded-md px-3 transition-colors duration-200 ease-out',
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
