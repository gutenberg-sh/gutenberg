import { ArrowLeft, AlertOctagon } from 'lucide-react';
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
    <section
      role="alert"
      aria-live="polite"
      className="grid items-start gap-8 border-y border-border/70 py-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12"
    >
      <div className="inline-flex size-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/8 text-destructive">
        <AlertOctagon className="size-5" strokeWidth={1.75} aria-hidden />
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-destructive">
            Stopped
          </p>
          <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] sm:text-[30px]">
            {title}
          </h2>
        </div>
        <p className="max-w-[60ch] break-words text-[15px] leading-relaxed text-muted-foreground">
          {message}
        </p>
        <div>
          <Link
            to={back_to}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-card active:translate-y-[1px]"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} aria-hidden />
            Back
          </Link>
        </div>
      </div>
    </section>
  );
}
