import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function LookupForm() {
  const navigate = useNavigate();
  const [release_spec, set_release_spec] = useState('');
  const [error, set_error] = useState<string | undefined>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    set_error(undefined);

    const trimmed = release_spec.trim();
    const at = trimmed.indexOf('@');

    if (at === trimmed.length - 1) {
      set_error('Releases are addressed as name@version.');
      return;
    }

    const has_version = at > 0;
    const name = has_version ? trimmed.slice(0, at) : trimmed;
    const version = has_version ? trimmed.slice(at + 1) : undefined;

    if (!NAME_RE.test(name)) {
      set_error(
        'Name must be lowercase letters, numbers, dots, underscores, or hyphens.',
      );
      return;
    }

    void navigate(
      version === undefined
        ? `/r/${encodeURIComponent(name)}`
        : `/r/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    );
  };

  const has_error = Boolean(error);

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(
        'group/form relative grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-paper backdrop-blur-sm sm:p-6',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor="release-spec"
          className="text-[13px] font-medium text-foreground"
        >
          Open a release
        </label>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
          name@version or name
        </span>
      </div>

      <div
        className={cn(
          'group flex items-stretch gap-px rounded-xl border bg-background/80 transition-colors',
          'focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring/40',
          has_error
            ? 'border-destructive/70 focus-within:border-destructive/80 focus-within:ring-destructive/30'
            : 'border-border',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none flex select-none items-center pl-3.5 pr-1 font-mono text-[13px] text-muted-foreground/70"
        >
          /r/
        </span>
        <input
          id="release-spec"
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={has_error || undefined}
          aria-describedby={has_error ? 'release-spec-error' : undefined}
          placeholder="gutenberg-demo@1.0.0"
          value={release_spec}
          onChange={(event) => set_release_spec(event.target.value)}
          required
          className="min-w-0 flex-1 bg-transparent py-3 pr-3 font-mono text-[13.5px] tabular text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <button
          type="submit"
          className={cn(
            'group/btn m-1 inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background transition-all',
            'hover:bg-foreground/92 active:translate-y-[1px] active:scale-[0.985]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          )}
        >
          Verify
          <ArrowRight
            className="size-3.5 transition-transform group-hover/btn:translate-x-0.5"
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>

      <div className="flex min-h-[18px] items-center justify-between gap-3 text-[12px]">
        {has_error ? (
          <p
            id="release-spec-error"
            role="alert"
            className="text-destructive"
          >
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground/80">
            Verification runs locally. We never proxy the bundle.
          </p>
        )}
      </div>
    </form>
  );
}
