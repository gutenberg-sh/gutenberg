import { ArrowRight, ArrowUpRight, CornerDownLeft, Search } from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { PublisherAddressLink } from '@/components/PublisherAddressLink';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { format_relative_time, shorten } from '@/lib/format';
import { useNameSearch, type NameDto } from '@/lib/queries';
import { cn } from '@/lib/utils';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const SUGGESTION_LIMIT = 8;

type Size = 'sm' | 'lg';

export function LookupForm({
  auto_focus = false,
  size = 'lg',
  placeholder = 'find a publication or publisher',
  on_navigate,
  className,
}: {
  auto_focus?: boolean;
  size?: Size;
  placeholder?: string;
  on_navigate?: () => void;
  className?: string;
} = {}) {
  const navigate = useNavigate();
  const input_ref = useRef<HTMLInputElement>(null);
  const list_ref = useRef<HTMLUListElement>(null);
  const input_id = useId();
  const list_id = `${input_id}-suggestions`;
  const error_id = `${input_id}-error`;

  const [release_spec, set_release_spec] = useState('');
  const [error, set_error] = useState<string | undefined>();
  const [focused, set_focused] = useState(false);
  const [highlight, set_highlight] = useState(0);

  const trimmed = release_spec.trim();
  const has_at = trimmed.includes('@');
  const debounced_query = useDebouncedValue(has_at ? '' : trimmed, 140);

  const search = useNameSearch(
    {
      q: debounced_query,
      limit: SUGGESTION_LIMIT,
      includes: 'releases,publisher',
    },
    { enabled: focused && debounced_query.length > 0 },
  );

  const suggestions = useMemo<NameDto[]>(
    () => (focused && debounced_query.length > 0 ? (search.data ?? []) : []),
    [focused, debounced_query, search.data],
  );

  const reset_key = `${debounced_query}::${suggestions.length}`;
  const [last_reset_key, set_last_reset_key] = useState(reset_key);
  if (last_reset_key !== reset_key) {
    set_last_reset_key(reset_key);
    set_highlight(0);
  }

  useEffect(() => {
    if (!auto_focus) return;
    const frame = requestAnimationFrame(() => {
      input_ref.current?.focus();
      input_ref.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [auto_focus]);

  function go_to_release(name: string, version: string) {
    on_navigate?.();
    void navigate(
      `/publication/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    );
  }

  function go_to_name(name: string) {
    on_navigate?.();
    void navigate(`/publication/${encodeURIComponent(name)}`);
  }

  function go_to_search(query: string) {
    on_navigate?.();
    void navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    set_error(undefined);

    const highlighted = suggestions[highlight];
    if (highlighted) {
      go_to_name(highlighted.name);
      return;
    }

    if (!trimmed) {
      set_error('Type a name to start.');
      return;
    }

    if (!has_at) {
      go_to_search(trimmed);
      return;
    }

    const at = trimmed.indexOf('@');
    if (at <= 0 || at === trimmed.length - 1) {
      set_error('Publications use the form name@version (e.g. gutenberg-demo@1.0.0).');
      return;
    }

    const name = trimmed.slice(0, at);
    const version = trimmed.slice(at + 1);

    if (!NAME_RE.test(name)) {
      set_error(
        'Names use lowercase letters, numbers, dots, underscores, or hyphens.',
      );
      return;
    }

    go_to_release(name, version);
  }

  function on_key_down(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      set_highlight((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      set_highlight(
        (current) => (current - 1 + suggestions.length) % suggestions.length,
      );
    } else if (event.key === 'Escape') {
      if (release_spec) {
        event.preventDefault();
        set_release_spec('');
      }
    }
  }

  const has_error = Boolean(error);
  const show_dropdown = focused && debounced_query.length > 0;
  const empty_results =
    show_dropdown &&
    !search.isLoading &&
    !search.isError &&
    suggestions.length === 0;

  const lg = size === 'lg';

  return (
    <div className={cn('grid w-full gap-2', className)}>
      <form
        onSubmit={submit}
        noValidate
        role="search"
        aria-label="Search the registry"
        className="relative grid gap-2"
      >
        <div
          className={cn(
            'flex items-stretch overflow-hidden rounded-none border-2 border-border bg-card transition-colors',
            has_error
              ? 'border-destructive/70'
              : focused
                ? 'border-foreground/35'
                : 'border-border-strong/70',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none flex select-none items-center text-muted-foreground',
              lg ? 'pl-5 pr-2.5' : 'pl-3.5 pr-1.5',
            )}
          >
            <Search
              className={lg ? 'size-4' : 'size-3.5'}
              strokeWidth={1.85}
            />
          </span>

          <input
            ref={input_ref}
            id={input_id}
            type="text"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={show_dropdown}
            aria-controls={list_id}
            aria-autocomplete="list"
            aria-activedescendant={
              suggestions[highlight]
                ? `${list_id}-${suggestions[highlight].id}`
                : undefined
            }
            aria-invalid={has_error || undefined}
            aria-describedby={has_error ? error_id : undefined}
            placeholder={placeholder}
            value={release_spec}
            onFocus={() => set_focused(true)}
            onBlur={() => {
              window.setTimeout(() => set_focused(false), 80);
            }}
            onChange={(event) => {
              set_release_spec(event.target.value);
              set_error(undefined);
            }}
            onKeyDown={on_key_down}
            required
            className={cn(
              'min-w-0 flex-1 bg-transparent font-mono tabular text-foreground placeholder:text-muted-foreground/55 focus:outline-none',
              lg
                ? 'h-14 pr-2 text-[15px]'
                : 'h-11 pr-2 text-[13.5px]',
            )}
          />

          <button
            type="submit"
            aria-label={has_at ? 'Open publication' : 'Search'}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              lg ? 'mx-1.5 my-1.5 rounded-none px-4 text-[13.5px]' : 'mx-1 my-1 rounded-none px-3 text-[12.5px]',
            )}
          >
            <span className="inline-flex min-w-[4.25rem] justify-center">
              {has_at ? 'Open' : 'Search'}
            </span>
            <ArrowRight
              className={lg ? 'size-3.5' : 'size-3'}
              strokeWidth={2}
              aria-hidden
            />
          </button>
        </div>

        <p
          id={has_error ? error_id : undefined}
          role={has_error ? 'alert' : undefined}
          className={cn(
            'px-1 text-[12px]',
            has_error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {has_error ? (
            error
          ) : (
            <>
              <span className="font-mono tabular text-foreground-soft">
                ↑↓
              </span>{' '}
              to pick ·{' '}
              <span className="font-mono tabular text-foreground-soft">
                ↵
              </span>{' '}
              to open ·{' '}
              <span className="font-mono tabular text-foreground-soft">
                name@version
              </span>{' '}
              opens that exact publication
            </>
          )}
        </p>

        {show_dropdown ? (
          <div className="absolute inset-x-0 top-full z-30 mt-2">
            {search.isLoading ? (
              <SuggestionSkeleton />
            ) : search.isError ? (
              <div className="rounded-none border-2 border-border bg-elevated px-4 py-3 text-[12px] text-muted-foreground">
                Search is offline. You can still open a publication by typing{' '}
                <span className="font-mono tabular text-foreground">
                  name@version
                </span>
                .
              </div>
            ) : empty_results ? (
              <div className="flex items-center justify-between gap-3 rounded-none border-2 border-border bg-elevated px-4 py-3 text-[12.5px] text-muted-foreground">
                <span>
                  Nothing matches{' '}
                  <span className="font-mono tabular text-foreground">
                    {debounced_query}
                  </span>
                  .
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go_to_search(debounced_query)}
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                >
                  Open search
                  <ArrowUpRight className="size-3" strokeWidth={1.85} />
                </button>
              </div>
            ) : (
              <ul
                id={list_id}
                ref={list_ref}
                role="listbox"
                className="grid max-h-[min(70vh,340px)] divide-y divide-border overflow-y-auto overscroll-contain rounded-none border-2 border-border bg-elevated"
              >
                {suggestions.map((item, idx) => (
                  <SuggestionItem
                    key={item.id}
                    id={`${list_id}-${item.id}`}
                    item={item}
                    active={highlight === idx}
                    on_hover={() => set_highlight(idx)}
                    on_select={() => go_to_name(item.name)}
                  />
                ))}
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go_to_search(debounced_query)}
                    className="flex w-full items-center justify-between gap-2 bg-surface/40 px-4 py-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-surface/80 hover:text-foreground"
                  >
                    <span>
                      See all results for{' '}
                      <span className="font-mono tabular text-foreground">
                        {debounced_query}
                      </span>
                    </span>
                    <CornerDownLeft className="size-3" strokeWidth={1.85} />
                  </button>
                </li>
              </ul>
            )}
          </div>
        ) : null}
      </form>
    </div>
  );
}

function SuggestionItem({
  id,
  item,
  active,
  on_hover,
  on_select,
}: {
  id: string;
  item: NameDto;
  active: boolean;
  on_hover: () => void;
  on_select: () => void;
}) {
  const latest = item.releases?.[0];
  const publisher_address = item.publisher?.address;

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={on_hover}
      onClick={on_select}
      className={cn(
        'grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors',
        active ? 'bg-surface/80' : 'bg-transparent',
      )}
    >
      <div className="grid min-w-0 gap-0.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[14px] font-medium text-foreground">
            {item.name}
          </span>
          {latest ? (
            <span className="font-mono text-[11.5px] tabular text-foreground-soft">
              {latest.version}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {publisher_address ? (
            <PublisherAddressLink
              address={publisher_address}
              avatarSize={18}
              onClick={(e) => e.stopPropagation()}
              className="font-mono tabular text-foreground-soft hover:text-foreground hover:underline"
            >
              {shorten(publisher_address, 4, 4)}
            </PublisherAddressLink>
          ) : (
            <span className="font-mono tabular text-muted-foreground">—</span>
          )}
          {latest ? (
            <>
              <span aria-hidden className="text-muted-foreground/50">
                ·
              </span>
              <span>{format_relative_time(latest.published_at)}</span>
            </>
          ) : null}
        </div>
      </div>
      <ArrowUpRight
        className={cn(
          'size-3.5 transition-all',
          active
            ? '-translate-y-0.5 translate-x-0.5 text-foreground'
            : 'text-muted-foreground',
        )}
        strokeWidth={1.85}
        aria-hidden
      />
    </li>
  );
}

function SuggestionSkeleton() {
  return (
    <ul
      aria-hidden
      className="grid divide-y divide-border overflow-hidden rounded-none border-2 border-border bg-elevated"
    >
      {Array.from({ length: 3 }).map((_, idx) => (
        <li key={idx} className="grid gap-1.5 px-4 py-3">
          <div className="h-3.5 w-1/2 max-w-[12rem] animate-pulse rounded-none bg-muted" />
          <div className="h-3 w-1/3 max-w-[10rem] animate-pulse rounded-none bg-muted/70" />
        </li>
      ))}
    </ul>
  );
}
