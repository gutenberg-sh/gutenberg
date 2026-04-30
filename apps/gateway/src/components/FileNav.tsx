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
    <nav aria-label="Pages" className="rounded-lg border bg-card p-3">
      <p className="mb-2 px-1 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground/80">
        Pages
      </p>
      <ul className="grid gap-0.5 text-sm">
        {files.map((path) => {
          const active = path === current_path;
          const label = path === '/' ? 'root' : path.slice(1);
          const href = `${base_path}${encode_site_path(path)}`;

          return (
            <li key={path}>
              <Link
                to={href}
                className={cn(
                  'block rounded-md px-2 py-1 font-mono text-xs hover:bg-accent hover:text-accent-foreground',
                  active && 'bg-accent text-accent-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {label}
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
