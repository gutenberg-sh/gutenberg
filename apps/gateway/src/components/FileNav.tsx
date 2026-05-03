import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export function FileNav({
  files,
  base_path,
  current_path,
}: {
  files: ReadonlyArray<`/${string}`>;
  base_path: string;
  current_path: `/${string}`;
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Pages"
      className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
    >
      <p className="mb-3 flex items-baseline justify-between text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
        <span>Markdown pages</span>
        <span className="font-mono tabular text-muted-foreground/70 normal-case tracking-normal">
          {files.length.toString().padStart(2, '0')}
        </span>
      </p>
      <ul className="grid">
        {files.map((path, idx) => {
          const active = path === current_path;
          const label = path === '/' ? 'index' : path.replace(/^\//, '');
          const href = `${base_path}${encode_release_path(path)}`;
          const number = (idx + 1).toString().padStart(2, '0');

          return (
            <li
              key={path}
              className="border-t border-border/60 last:border-b last:border-border/60"
            >
              <Link
                to={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-2.5 transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-foreground-soft hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-block w-[18px] font-mono text-[10.5px] tabular',
                    active
                      ? 'text-accent'
                      : 'text-muted-foreground/60 group-hover:text-foreground/70',
                  )}
                >
                  {number}
                </span>
                <span className="truncate font-mono text-[12.5px] tabular">
                  {label}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'inline-block h-3 w-[2px] rounded-none transition-colors',
                    active
                      ? 'bg-accent'
                      : 'bg-transparent group-hover:bg-foreground/30',
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function encode_release_path(path: `/${string}`): string {
  return path
    .split('/')
    .map((segment) => (segment ? encodeURIComponent(segment) : ''))
    .join('/');
}
