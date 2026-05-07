import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { LookupForm } from '@/components/LookupForm';
import { Button } from '@/components/ui/button';
import { overlay_panel_lg, overlay_scrim } from '@/lib/overlay-surface';
import { cn } from '@/lib/utils';

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
      role="presentation"
      onClick={() => on_open_change(false)}
      className={cn(overlay_scrim, 'z-60')}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Open a release"
        onClick={(event) => event.stopPropagation()}
        className={cn(overlay_panel_lg, 'pt-3')}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Close"
          onClick={() => on_open_change(false)}
          className="absolute right-3 top-3 z-10 size-7 rounded-lg border border-border bg-elevated/80 text-muted-foreground hover:border-foreground/40 hover:bg-elevated hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={1.85} aria-hidden />
        </Button>
        <div className="mb-3 pr-10 pt-0.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Registry quick open
          </p>
          <p className="mt-1 text-[13px] text-foreground-soft">
            Search the registry — or paste{' '}
            <span className="font-mono tabular text-foreground">
              registry_id@version
            </span>{' '}
            to jump straight to a release.
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
