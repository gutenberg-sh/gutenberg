import { cn } from '@/lib/utils';

/**
 * Vertical rails as on https://www.metengine.xyz/. At `sm:` full-bleed; below `sm`,
 * inset from viewport so the frame is not edge-glued; shell uses `px-6` so copy
 * sits slightly inside the rails.
 */
export function PageFrameRails() {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 z-20 mx-auto max-w-[1332px] border-x border-border/46 max-sm:left-5 max-sm:right-5 sm:inset-0',
        'dark:border-border',
      )}
    />
  );
}
