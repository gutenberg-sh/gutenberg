import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { LookupForm } from '@/components/LookupForm';
import { Button } from '@/components/ui/button';

export function LookupDialog({
  open,
  on_open_change,
}: {
  open: boolean;
  on_open_change: (open: boolean) => void;
}) {
  useEffect(() => {
    if (!open) return;

    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function on_keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        on_open_change(false);
      }
    }

    window.addEventListener('keydown', on_keydown);

    return () => {
      window.removeEventListener('keydown', on_keydown);
      document.body.style.overflow = previous_overflow;
    };
  }, [open, on_open_change]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Open a publication"
      onClick={() => on_open_change(false)}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/92 p-4 pt-[18vh]"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-2xl"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Close"
          onClick={() => on_open_change(false)}
          className="absolute -right-2 -top-2 z-10 size-7 rounded-none border-2 border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={1.85} aria-hidden />
        </Button>
        <div className="mb-3 px-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Registry quick open
          </p>
          <p className="mt-1 text-[13px] text-foreground-soft">
            Search the registry — or paste{' '}
            <span className="font-mono tabular text-foreground">name@version</span>{' '}
            to jump straight to a version.
          </p>
        </div>
        <LookupForm
          auto_focus
          size="lg"
          placeholder="ledger-field-guide or aurora-kit@2.4.1"
          on_navigate={() => on_open_change(false)}
        />
      </div>
    </div>,
    document.body,
  );
}
