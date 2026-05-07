import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function ErrorView({
  title,
  message,
  back_to = '/',
  extras,
}: {
  title: string;
  message: string;
  back_to?: string;
  extras?: ReactNode;
}) {
  return (
    <section role="alert" aria-live="polite" className="grid gap-5">
      <p className="text-xs font-medium tracking-wide text-destructive">
        Halted
      </p>
      <h2 className="text-[26px] font-semibold leading-[1.16] tracking-tight text-foreground sm:text-[32px] lg:text-[38px]">
        {title}
      </h2>
      <pre className="max-w-[60ch] whitespace-pre-wrap wrap-break-word font-sans text-[15px] leading-[1.68] text-foreground-soft sm:text-[16px]">
        {message}
      </pre>
      {extras ? <div className="grid gap-3">{extras}</div> : null}
      <div className="mt-2">
        <Link
          to={back_to}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong active:translate-y-px"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.85} aria-hidden />
          Back
        </Link>
      </div>
    </section>
  );
}
