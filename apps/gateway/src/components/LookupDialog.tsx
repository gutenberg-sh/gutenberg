import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { LookupForm } from '@/components/LookupForm';

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
      aria-label="Open a release"
      onClick={() => on_open_change(false)}
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-4 pt-[18vh] backdrop-blur-md"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-2xl"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => on_open_change(false)}
          className="absolute -right-2 -top-2 z-10 inline-flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-border-strong hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={1.85} aria-hidden />
        </button>
        <LookupForm
          auto_focus
          size="lg"
          on_navigate={() => on_open_change(false)}
        />
      </div>
    </div>,
    document.body,
  );
}
