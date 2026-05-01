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

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { format_relative_time, shorten } from '@/lib/format';
import { useNameSearch, type NameDto } from '@/lib/queries';
import { cn } from '@/lib/utils';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const SUGGESTION_LIMIT = 6;

export function LookupForm({
  auto_focus = false,
  on_navigate,
}: {
  auto_focus?: boolean;
  on_navigate?: () => void;
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
      includes: 'releases',
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
      `/r/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    );
  }

  function go_to_name(name: string) {
    on_navigate?.();
    void navigate(`/r/${encodeURIComponent(name)}`);
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
      set_error('Type a name to look up.');
      return;
    }

    if (!has_at) {
      go_to_search(trimmed);
      return;
    }

    const at = trimmed.indexOf('@');
    if (at <= 0 || at === trimmed.length - 1) {
      set_error('Releases are addressed as name@version.');
      return;
    }

    const name = trimmed.slice(0, at);
    const version = trimmed.slice(at + 1);

    if (!NAME_RE.test(name)) {
      set_error(
        'Name must use lowercase letters, numbers, dots, underscores, or hyphens.',
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
  const show_dropdown = focused && (debounced_query.length > 0);
  const empty_results =
    show_dropdown &&
    !search.isLoading &&
    !search.isError &&
    suggestions.length === 0;

  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <form
        onSubmit={submit}
        noValidate
        role="search"
        aria-label="Search the registry"
      >
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={input_id}
            className="text-[12px] font-medium tracking-[-0.005em] text-foreground"
          >
            Open a release
          </label>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
            name · name@version
          </span>
        </div>

        <div
          className={cn(
            'mt-3 flex items-stretch rounded-xl border bg-background transition-colors',
            has_error
              ? 'border-destructive/70'
              : focused
                ? 'border-foreground/25'
                : 'border-border',
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none flex select-none items-center pl-3 pr-1 text-muted-foreground"
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
            placeholder="search names or paste name@version"
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
            className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 font-mono text-[13.5px] tabular text-foreground placeholder:text-muted-foreground/55 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Submit"
            className="m-1 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/92 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <span>{has_at ? 'Verify' : 'Search'}</span>
            <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <p
          id={has_error ? error_id : undefined}
          role={has_error ? 'alert' : undefined}
          className={cn(
            'mt-2 text-[12px]',
            has_error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {has_error
            ? error
            : has_at
              ? 'Verifies in your browser. Nothing is uploaded.'
              : 'Live results from the registry index. Use ↑↓ to pick.'}
        </p>
      </form>

      {show_dropdown ? (
        <div className="-mx-1 -mb-1 grid">
          {search.isLoading ? (
            <SuggestionSkeleton />
          ) : search.isError ? (
            <p className="px-3 py-2 text-[12px] text-muted-foreground">
              Search is offline right now. Try{' '}
              <span className="font-mono tabular">name@version</span> to verify
              directly.
            </p>
          ) : empty_results ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
              <span>
                No releases match{' '}
                <span className="font-mono tabular text-foreground">
                  {debounced_query}
                </span>
                .
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go_to_search(debounced_query)}
                className="inline-flex items-center gap-1 text-foreground hover:underline"
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
              className="grid divide-y divide-border overflow-hidden rounded-lg border border-border bg-background"
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
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-surface/60 hover:text-foreground"
                >
                  <span>
                    See all results for{' '}
                    <span className="font-mono tabular text-foreground">
                      {debounced_query}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="size-3" strokeWidth={1.85} />
                  </span>
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
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
  const publisher = item.publisher_id;

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={on_hover}
      onClick={on_select}
      className={cn(
        'grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors',
        active ? 'bg-surface/80' : 'bg-transparent',
      )}
    >
      <div className="grid min-w-0 gap-0.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[13.5px] font-medium text-foreground">
            {item.name}
          </span>
          {latest ? (
            <span className="font-mono text-[11.5px] tabular text-foreground-soft">
              {latest.version}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="font-mono tabular">{shorten(publisher, 4, 4)}</span>
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
      className="grid divide-y divide-border overflow-hidden rounded-lg border border-border bg-background"
    >
      {Array.from({ length: 3 }).map((_, idx) => (
        <li key={idx} className="grid gap-1.5 px-3 py-2.5">
          <div className="h-3.5 w-1/2 max-w-[12rem] animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-1/3 max-w-[10rem] animate-pulse rounded-md bg-muted/70" />
        </li>
      ))}
    </ul>
  );
}
