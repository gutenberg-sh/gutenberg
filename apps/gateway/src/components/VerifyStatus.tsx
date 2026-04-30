import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export type VerifyStepState = 'pending' | 'running' | 'success' | 'error';

export type VerifyStep = {
  id: string;
  label: string;
  state: VerifyStepState;
  detail?: string;
};

export function VerifyStatus({ steps }: { steps: readonly VerifyStep[] }) {
  return (
    <ol className="grid gap-2">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-3 text-sm">
          <StatusIcon state={step.state} />
          <div className="grid gap-0.5">
            <span
              className={cn(
                step.state === 'pending' && 'text-muted-foreground',
                step.state === 'error' && 'text-destructive',
              )}
            >
              {step.label}
            </span>
            {step.detail ? (
              <span className="text-xs text-muted-foreground">
                {step.detail}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StatusIcon({ state }: { state: VerifyStepState }) {
  if (state === 'pending') {
    return (
      <CircleDashed
        className="mt-0.5 size-4 text-muted-foreground"
        aria-hidden
      />
    );
  }

  if (state === 'running') {
    return (
      <Loader2
        className="mt-0.5 size-4 animate-spin text-muted-foreground"
        aria-hidden
      />
    );
  }

  if (state === 'success') {
    return (
      <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" aria-hidden />
    );
  }

  return <XCircle className="mt-0.5 size-4 text-destructive" aria-hidden />;
}
