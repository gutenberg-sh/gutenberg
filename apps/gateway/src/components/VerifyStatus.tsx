import { Check, CircleDashed, Loader2, X } from 'lucide-react';

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
  const progress = total === 0 ? 0 : (done / total) * 100;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Local verification
          </p>
          <p className="text-[11px] tabular text-muted-foreground">
            <span
              className={cn(
                'font-mono',
                has_error ? 'text-destructive' : 'text-foreground',
              )}
            >
              {done}
            </span>
            <span className="text-muted-foreground/60"> / </span>
            <span className="font-mono tabular">{total}</span>
          </p>
        </div>
        <div
          className="relative h-1 w-full overflow-hidden rounded-full bg-border/60"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              'absolute inset-y-0 left-0 transition-[width] duration-500 ease-out',
              has_error
                ? 'bg-destructive'
                : 'bg-foreground',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {running ? (
          <p className="text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">{running.label}</span>
            {running.detail ? <span> · {running.detail}</span> : null}
          </p>
        ) : null}
      </div>

      <ol className="grid gap-0 divide-y divide-border/70 border-y border-border/70">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-3 px-1 py-2.5 text-[13px]"
          >
            <StatusIcon state={step.state} />
            <div className="grid min-w-0 gap-0.5">
              <span
                className={cn(
                  'leading-tight',
                  step.state === 'pending' && 'text-muted-foreground',
                  step.state === 'error' && 'text-destructive',
                  step.state === 'success' && 'text-foreground',
                  step.state === 'running' && 'text-foreground',
                )}
              >
                {step.label}
              </span>
              {step.detail ? (
                <span className="break-all text-[11.5px] text-muted-foreground">
                  {step.detail}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatusIcon({ state }: { state: VerifyStepState }) {
  if (state === 'pending') {
    return (
      <CircleDashed
        className="mt-0.5 size-4 shrink-0 text-muted-foreground/60"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }

  if (state === 'running') {
    return (
      <Loader2
        className="mt-0.5 size-4 shrink-0 animate-spin text-foreground/80"
        strokeWidth={2}
        aria-hidden
      />
    );
  }

  if (state === 'success') {
    return (
      <span
        aria-hidden
        className="mt-[1px] inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="mt-[1px] inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
    >
      <X className="size-3" strokeWidth={3} />
    </span>
  );
}
