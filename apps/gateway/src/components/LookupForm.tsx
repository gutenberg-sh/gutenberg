import { REGISTRY_ID_RE } from '@gutenberg/core';
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
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { format_empty, format_relative_time, shorten } from '@/lib/format';
import { usePublicationSearch, type PublicationDto } from '@/lib/queries';
import { registry_data_card } from '@/lib/registry-surface';
import { cn } from '@/lib/utils';
const SUGGESTION_LIMIT = 8;

type Size = 'sm' | 'lg';

export function LookupForm({
  auto_focus = false,
  size = 'lg',
  placeholder = 'find a publication (registry id) or publisher',
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

  const search = usePublicationSearch(
    {
      q: debounced_query,
      limit: SUGGESTION_LIMIT,
      includes: 'releases,publisher',
    },
    { enabled: focused && debounced_query.length > 0 },
  );

  const suggestions = useMemo<PublicationDto[]>(
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

  function go_to_release(registry_id: string, version: string) {
    on_navigate?.();
    void navigate(
      `/publication/${encodeURIComponent(registry_id)}/${encodeURIComponent(version)}`,
    );
  }

  function go_to_publication(registry_id: string) {
    on_navigate?.();
    void navigate(`/publication/${encodeURIComponent(registry_id)}`);
  }

  function go_to_search(query: string) {
    on_navigate?.();
    void navigate(`/browse?q=${encodeURIComponent(query)}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    set_error(undefined);

    const highlighted = suggestions[highlight];
    if (highlighted) {
      go_to_publication(highlighted.registry_id);
      return;
    }

    if (!trimmed) {
      set_error('Type a registry id or search query to start.');
      return;
    }

    if (!has_at) {
      go_to_search(trimmed);
      return;
    }

    const at = trimmed.indexOf('@');
    if (at <= 0 || at === trimmed.length - 1) {
      set_error('Use registry_id@version (e.g. gutenberg-demo@1.0.0).');
      return;
    }

    const registry_id = trimmed.slice(0, at);
    const version = trimmed.slice(at + 1);

    if (!REGISTRY_ID_RE.test(registry_id)) {
      set_error(
        'Registry ids use lowercase letters, numbers, dots, underscores, or hyphens.',
      );
      return;
    }

    go_to_release(registry_id, version);
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
            registry_data_card,
            'flex items-stretch transition-[border-color,background-color] duration-200 ease-out',
            has_error
              ? 'border-destructive/55 ring-2 ring-destructive/30'
              : focused
                ? 'border-primary/50 ring-2 ring-primary/35'
                : 'border-border ring-1 ring-border/35 dark:border-border dark:ring-border/30',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none flex shrink-0 select-none items-center text-muted-foreground',
              lg ? 'pl-2.5 pr-1.5 sm:pl-4 sm:pr-2' : 'pl-3.5 pr-1.5',
            )}
          >
            <Search className="size-3.5" strokeWidth={1.85} />
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
              'min-w-0 flex-1 bg-transparent font-mono tabular text-foreground placeholder:text-muted-foreground/75 focus:outline-none',
              lg ? 'h-12 pr-2 text-[14px]' : 'h-11 pr-2 text-[13.5px]',
            )}
          />

          <Button
            type="submit"
            aria-label={has_at ? 'Open release' : 'Search'}
            className={cn(
              'shrink-0 gap-1.5 font-medium active:translate-y-px',
              lg
                ? 'h-full min-h-12 self-stretch rounded-none border-l border-border/30 px-2.5 py-0 text-[12.5px] sm:px-3.5 sm:text-[13px]'
                : 'mx-1 my-1 rounded-lg px-3 text-[12.5px]',
            )}
          >
            <span className="inline-flex min-w-[3.25rem] justify-center sm:min-w-[4.25rem]">
              {has_at ? 'Open' : 'Search'}
            </span>
            <ArrowRight className="size-3" strokeWidth={2} aria-hidden />
          </Button>
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
              <span className="font-mono tabular text-foreground-soft">↑↓</span>{' '}
              to pick ·{' '}
              <span className="font-mono tabular text-foreground-soft">↵</span>{' '}
              to open
            </>
          )}
        </p>

        {show_dropdown ? (
          <div className="absolute inset-x-0 top-full z-30 mt-2">
            {search.isLoading ? (
              <SuggestionSkeleton />
            ) : search.isError ? (
              <div
                className={cn(
                  registry_data_card,
                  'px-4 py-3 text-[12px] text-muted-foreground',
                )}
              >
                Search is offline. You can still open a release by typing{' '}
                <span className="font-mono tabular text-foreground">
                  registry_id@version
                </span>
                .
              </div>
            ) : empty_results ? (
              <div
                className={cn(
                  registry_data_card,
                  'flex items-center justify-between gap-3 px-4 py-3 text-[12.5px] text-muted-foreground',
                )}
              >
                <span>
                  Nothing matches{' '}
                  <span className="font-mono tabular text-foreground">
                    {debounced_query}
                  </span>
                  .
                </span>
                <Button
                  type="button"
                  variant="link"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go_to_search(debounced_query)}
                  className="h-auto gap-1 px-0 py-0 font-medium text-foreground hover:underline"
                >
                  See all results
                  <ArrowUpRight className="size-3" strokeWidth={1.85} />
                </Button>
              </div>
            ) : (
              <ul
                id={list_id}
                ref={list_ref}
                role="listbox"
                className={cn(
                  registry_data_card,
                  'grid max-h-[min(70vh,340px)] divide-y divide-border/25 overflow-y-auto overscroll-contain',
                )}
              >
                {suggestions.map((item, idx) => (
                  <SuggestionItem
                    key={item.id}
                    id={`${list_id}-${item.id}`}
                    item={item}
                    active={highlight === idx}
                    on_hover={() => set_highlight(idx)}
                    on_select={() => go_to_publication(item.registry_id)}
                  />
                ))}
                <li>
                  <Button
                    type="button"
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go_to_search(debounced_query)}
                    className="h-auto w-full justify-between gap-2 rounded-lg bg-surface/40 px-4 py-2.5 text-[12px] font-normal text-muted-foreground hover:bg-surface/80 hover:text-foreground"
                  >
                    <span>
                      See all results for{' '}
                      <span className="font-mono tabular text-foreground">
                        {debounced_query}
                      </span>
                    </span>
                    <CornerDownLeft className="size-3" strokeWidth={1.85} />
                  </Button>
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
  item: PublicationDto;
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
            {item.registry_id}
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
            <span className="font-mono tabular text-muted-foreground">{format_empty}</span>
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
      className={cn(
        registry_data_card,
        'grid divide-y divide-border/25 overflow-hidden',
      )}
    >
      {Array.from({ length: 3 }).map((_, idx) => (
        <li key={idx} className="grid gap-1.5 px-4 py-3">
          <div className="h-3.5 w-1/2 max-w-[12rem] animate-pulse rounded-lg bg-muted" />
          <div className="h-3 w-1/3 max-w-[10rem] animate-pulse rounded-lg bg-muted/70" />
        </li>
      ))}
    </ul>
  );
}
