/**
 * Shared Tailwind class strings for registry feeds, cards, and chrome.
 * Keeps surfaces consistent without custom CSS in `globals.css`.
 */
export const registry_data_card =
  'overflow-hidden rounded-xl border border-border/30 bg-card/45 shadow-sm ring-1 ring-border/15 dark:bg-card/35 dark:ring-border/10';

export const registry_data_card_accent =
  'overflow-hidden rounded-xl border border-accent/20 bg-accent/5 shadow-sm ring-1 ring-accent/15';

/** Horizontal inset aligned with feed rows / header. */
export const registry_feed_x = 'px-3 sm:px-4';

/** Vertical space between feed body and footer or empty blocks. */
export const registry_feed_y_gutter = 'py-7 sm:py-9';

export const registry_empty_panel =
  'grid w-full place-items-center gap-3 rounded-xl border border-dashed border-border/35 bg-elevated/25 px-4 py-12 text-center sm:px-5 sm:py-14';

export const registry_empty_panel_compact =
  'w-full rounded-xl border border-dashed border-border/35 bg-elevated/25 px-4 py-8 text-center text-[12.5px] text-muted-foreground sm:px-5 sm:py-10';

export const registry_card_inset = 'px-3 py-6 sm:px-4 sm:py-8';

export const registry_nested_panel =
  'rounded-lg border border-border/20 bg-elevated/25 px-2.5 py-2';

/** Outline control / secondary CTA (header wallet, nav publish mobile, landing secondary). */
export const registry_command_shell =
  'rounded-md border border-border bg-surface shadow-sm ring-1 ring-border/15 dark:ring-border/10';

/** Small key cap (hints next to lookup, 404). */
export const kbd_chrome =
  'inline-flex h-[1.4rem] min-w-[1.4rem] items-center justify-center rounded-sm border border-border bg-surface px-1.5 font-mono text-[10px] font-medium leading-none tracking-wide text-muted-foreground';
