import type { ReactNode } from 'react';

import { Container } from '@/components/Layout';
import { registry_page_eyebrow, registry_page_stack } from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

/** `className` helper: stacked body regions (e.g. form sections). */
export const registry_page_body_gap = 'grid gap-6';

/** Between major body blocks (e.g. publish form grid and sign footer). */
export const registry_page_block_gap = 'gap-10 lg:gap-12';

type RegistryPageLayoutProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  headerAside?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Shared page shell: mono eyebrow, title row with optional trailing actions,
 * prose description, then route body. Keeps registry routes visually one system.
 */
export function RegistryPageLayout({
  eyebrow,
  title,
  description,
  headerAside,
  children,
  className,
}: RegistryPageLayoutProps) {
  return (
    <Container className={cn(registry_page_stack, className)}>
      <header className="grid gap-3">
        <p className={registry_page_eyebrow}>{eyebrow}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">{title}</div>
          {headerAside ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {headerAside}
            </div>
          ) : null}
        </div>
        {description ? (
          <div className="grid max-w-[62ch] gap-3 text-[15px] leading-[1.68] text-foreground-soft">
            {description}
          </div>
        ) : null}
      </header>
      {children}
    </Container>
  );
}

export function RegistryPageTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        'text-balance text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.5rem]',
        className,
      )}
    >
      {children}
    </h1>
  );
}
