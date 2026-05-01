import { ArrowRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function LookupForm({
  auto_focus = false,
  on_navigate,
}: {
  auto_focus?: boolean;
  on_navigate?: () => void;
} = {}) {
  const navigate = useNavigate();
  const input_ref = useRef<HTMLInputElement>(null);
  const input_id = useId();
  const error_id = `${input_id}-error`;
  const [release_spec, set_release_spec] = useState('');
  const [error, set_error] = useState<string | undefined>();
  const [focused, set_focused] = useState(false);

  useEffect(() => {
    if (!auto_focus) return;
    const frame = requestAnimationFrame(() => {
      input_ref.current?.focus();
      input_ref.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [auto_focus]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    set_error(undefined);

    const trimmed = release_spec.trim();
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

    on_navigate?.();
    void navigate(
      `/r/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    );
  };

  const has_error = Boolean(error);

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={input_id}
          className="text-[12px] font-medium tracking-[-0.005em] text-foreground"
        >
          Open a release
        </label>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          name@version
        </span>
      </div>

      <div
        className={cn(
          'flex items-stretch rounded-xl border bg-background transition-colors',
          has_error
            ? 'border-destructive/70'
            : focused
              ? 'border-foreground/25'
              : 'border-border',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none flex select-none items-center pl-3 pr-1 font-mono text-[12.5px] text-muted-foreground"
        >
          /r/
        </span>
        <input
          ref={input_ref}
          id={input_id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={has_error || undefined}
          aria-describedby={has_error ? error_id : undefined}
          placeholder="gutenberg-demo@1.0.0"
          value={release_spec}
          onFocus={() => set_focused(true)}
          onBlur={() => set_focused(false)}
          onChange={(event) => set_release_spec(event.target.value)}
          required
          className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 font-mono text-[13.5px] tabular text-foreground placeholder:text-muted-foreground/55 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Verify release"
          className="m-1 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/92 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <span>Verify</span>
          <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <p
        id={has_error ? error_id : undefined}
        role={has_error ? 'alert' : undefined}
        className={cn(
          'text-[12px]',
          has_error ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {has_error
          ? error
          : 'Verifies in your browser. Nothing is uploaded.'}
      </p>
    </form>
  );
}
