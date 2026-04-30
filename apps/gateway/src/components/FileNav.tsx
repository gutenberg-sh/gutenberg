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
      className="lg:sticky lg:top-24"
    >
      <p className="mb-3 flex items-baseline justify-between text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
        <span>Index</span>
        <span className="font-mono tabular text-muted-foreground/70 normal-case tracking-normal">
          {files.length}
        </span>
      </p>
      <ul className="grid gap-px border-y border-border/70">
        {files.map((path) => {
          const active = path === current_path;
          const label = path === '/' ? 'index' : path.replace(/^\//, '');
          const href = `${base_path}${encode_site_path(path)}`;

          return (
            <li
              key={path}
              className={cn(
                'relative',
                'after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-border/40',
              )}
            >
              <Link
                to={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-2 px-2 py-2 font-mono text-[12.5px] tabular transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-block h-3.5 w-[2px] shrink-0 rounded-full transition-colors',
                    active
                      ? 'bg-accent'
                      : 'bg-border group-hover:bg-foreground/40',
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function encode_site_path(path: `/${string}`): string {
  return path
    .split('/')
    .map((segment) => (segment ? encodeURIComponent(segment) : ''))
    .join('/');
}
