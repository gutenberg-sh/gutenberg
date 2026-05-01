import { Github } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { LookupDialog } from '@/components/LookupDialog';
import { Wordmark } from '@/components/Wordmark';

export function SiteHeader() {
  const [is_mac] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform),
  );
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
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-3 lg:px-10">
          <Link
            to="/"
            aria-label="Gutenberg gateway, home"
            className="group inline-flex items-baseline outline-none transition-opacity focus-visible:opacity-80"
          >
            <Wordmark className="text-[14px] text-foreground" />
          </Link>

          <div className="flex items-center gap-2 text-[13px]">
            <button
              type="button"
              onClick={() => set_lookup_open(true)}
              className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground sm:inline-flex"
            >
              <span className="text-[12.5px]">Lookup release</span>
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
