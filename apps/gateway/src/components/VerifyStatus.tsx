import { Check, Loader2, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export type VerifyStepState = 'pending' | 'running' | 'success' | 'error';

export type VerifyStep = {
  id: string;
  label: string;
  state: VerifyStepState;
  detail?: string;
};

export function VerifyStatus({ steps }: { steps: readonly VerifyStep[] }) {
  const total = steps.length;
  const done = steps.filter((s) => s.state === 'success').length;
  const has_error = steps.some((s) => s.state === 'error');
  const running = steps.find((s) => s.state === 'running');
  const all_verified =
    total > 0 && done === total && !has_error;

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Verifying locally
          </p>
          <p className="text-[11px] font-mono tabular text-muted-foreground">
            <span
              className={cn(has_error ? 'text-destructive' : 'text-foreground')}
            >
              {done}
            </span>
            <span className="text-muted-foreground/50"> / </span>
            {total}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          className="grid h-1 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, 1fr)` }}
        >
          {steps.map((step) => (
            <span
              key={step.id}
              aria-label={step.label}
              className={cn(
                'h-1 rounded-none transition-colors duration-500 ease-out',
                step.state === 'success' &&
                  (has_error ? 'bg-foreground/40' : 'bg-accent'),
                step.state === 'running' &&
                  'bg-foreground/60 animate-[pulse-soft_1.6s_ease-in-out_infinite]',
                step.state === 'pending' && 'bg-border/80',
                step.state === 'error' && 'bg-destructive',
              )}
            />
          ))}
        </div>
        {running ? (
          <p className="text-[12px] text-muted-foreground">
            <span className="text-foreground">{running.label}</span>
            {running.detail ? (
              <span className="text-muted-foreground/80">
                {' · '}
                {running.detail}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <ol className="grid gap-0 divide-y divide-border/70 border-y border-border/70">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-3 py-2.5 text-[13px]"
          >
            <StatusIcon id={step.id} state={step.state} />
            <div className="grid min-w-0 gap-0.5">
              <span
                className={cn(
                  'leading-snug',
                  step.state === 'pending' && 'text-muted-foreground',
                  step.state === 'error' && 'text-destructive',
                  step.state !== 'pending' &&
                    step.state !== 'error' &&
                    'text-foreground',
                )}
              >
                {step.label}
              </span>
              {step.detail ? (
                <span className="break-all text-[11.5px] leading-[1.55] text-muted-foreground">
                  {step.detail}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {all_verified ? (
        <div
          className="grid justify-items-center gap-2 border-t border-border/70 pt-5"
          role="status"
          aria-live="polite"
          aria-label="Publication verified"
        >
          <span
            aria-hidden
            className="inline-flex size-10 items-center justify-center rounded-none bg-accent text-accent-foreground shadow-[inset_0_1px_0_oklch(1_0_0/12%)] motion-safe:animate-verify-big-check-pop motion-reduce:animate-none dark:shadow-[inset_0_1px_0_oklch(1_0_0/14%)]"
          >
            <Check className="size-5" strokeWidth={2.5} aria-hidden />
          </span>
          <p className="max-w-[36ch] text-center text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Publication verified locally
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StatusIcon({ id, state }: { id: string; state: VerifyStepState }) {
  if (state === 'pending') {
    return (
      <span
        aria-hidden
        className="mt-[2px] inline-flex size-4 shrink-0 items-center justify-center rounded-none border border-border bg-background transition-[border-color,background-color] duration-300 ease-out"
      />
    );
  }

  if (state === 'running') {
    return (
      <Loader2
        key={`${id}-run`}
        className="mt-[2px] size-4 shrink-0 animate-spin text-foreground/85"
        strokeWidth={2}
        aria-hidden
      />
    );
  }

  if (state === 'success') {
    return (
      <span
        key={`${id}-ok`}
        aria-hidden
        className="mt-[2px] inline-flex size-4 shrink-0 items-center justify-center rounded-none bg-accent text-accent-foreground motion-safe:animate-verify-check-pop motion-reduce:animate-none"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }

  return (
    <span
      key={`${id}-err`}
      aria-hidden
      className="mt-[2px] inline-flex size-4 shrink-0 items-center justify-center rounded-none bg-destructive text-destructive-foreground motion-safe:animate-verify-check-shake motion-reduce:animate-none"
    >
      <X className="size-3" strokeWidth={3} />
    </span>
  );
}
