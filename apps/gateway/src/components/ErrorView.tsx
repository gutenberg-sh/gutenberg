import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ErrorView({
  title,
  message,
  back_to = '/',
}: {
  title: string;
  message: string;
  back_to?: string;
}) {
  return (
    <section role="alert" aria-live="polite" className="grid gap-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-destructive">
        Halted
      </p>
      <h2 className="text-[26px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[32px] lg:text-[38px]">
        {title}
      </h2>
      <p className="max-w-[60ch] wrap-break-word text-[15px] leading-[1.6] text-foreground-soft sm:text-[16px]">
        {message}
      </p>
      <div className="mt-2">
        <Link
          to={back_to}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong active:translate-y-px"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.85} aria-hidden />
          Back
        </Link>
      </div>
    </section>
  );
}
