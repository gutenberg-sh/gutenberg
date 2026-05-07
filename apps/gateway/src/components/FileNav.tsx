import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export function FileNav({
  pages,
  assets,
  base_path,
  current_path,
  entry_path,
}: {
  pages: ReadonlyArray<`/${string}`>;
  assets: ReadonlyArray<`/${string}`>;
  base_path: string;
  current_path: `/${string}`;
  entry_path: `/${string}`;
}) {
  if (pages.length === 0 && assets.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Publication files"
      className="grid gap-6 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
    >
      {pages.length > 0 ? (
        <section
          className="grid gap-0"
          aria-labelledby="file-nav-pages-heading"
        >
          <ExplorerHeading
            id="file-nav-pages-heading"
            title="Pages"
            count={pages.length}
          />
          <ul className="grid">
            {pages.map((path, idx) => (
              <FileNavRow
                key={path}
                path={path}
                index_label={(idx + 1).toString().padStart(2, '0')}
                base_path={base_path}
                current_path={current_path}
                entry_path={entry_path}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {assets.length > 0 ? (
        <section
          className="grid gap-0"
          aria-labelledby="file-nav-assets-heading"
        >
          <ExplorerHeading
            id="file-nav-assets-heading"
            title="Assets"
            count={assets.length}
          />
          <ul className="grid">
            {assets.map((path, idx) => (
              <FileNavRow
                key={path}
                path={path}
                index_label={(idx + 1).toString().padStart(2, '0')}
                base_path={base_path}
                current_path={current_path}
                entry_path={entry_path}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </nav>
  );
}

function ExplorerHeading({
  id,
  title,
  count,
}: {
  id: string;
  title: string;
  count: number;
}) {
  return (
    <p
      id={id}
      className="mb-3 flex items-baseline justify-between text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80"
    >
      <span>{title}</span>
      <span className="font-mono tabular text-muted-foreground/70 normal-case tracking-normal">
        {count.toString().padStart(2, '0')}
      </span>
    </p>
  );
}

function FileNavRow({
  path,
  index_label,
  base_path,
  current_path,
  entry_path,
}: {
  path: `/${string}`;
  index_label: string;
  base_path: string;
  current_path: `/${string}`;
  entry_path: `/${string}`;
}) {
  const active = path === current_path;
  const is_entry = path === entry_path;
  const label = path === '/' ? 'index' : path.replace(/^\//, '');
  const href = `${base_path}${encode_release_path(path)}`;

  return (
    <li className="border-t border-border/60 last:border-b last:border-border/60">
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
          {index_label}
        </span>
        <span className="min-w-0 truncate font-mono text-[12.5px] tabular">
          {label}
          {is_entry ? (
            <span className="sr-only">, publication entry</span>
          ) : null}
        </span>
        <span
          aria-hidden
          className={cn(
            'inline-block h-3 w-[2px] rounded-lg transition-colors',
            active
              ? 'bg-accent'
              : 'bg-transparent group-hover:bg-foreground/30',
          )}
        />
      </Link>
    </li>
  );
}

function encode_release_path(path: `/${string}`): string {
  return path
    .split('/')
    .map((segment) => (segment ? encodeURIComponent(segment) : ''))
    .join('/');
}
