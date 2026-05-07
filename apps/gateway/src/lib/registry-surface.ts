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

/** Feed list shell — top/bottom rules only, no card elevation. */
export const registry_feed_shell = 'grid min-w-0 gap-0 border-y border-border';

/** Column titles in registry feed tables (browse, publish composer, etc.). */
export const registry_feed_column_header_typography =
  'text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground';

/**
 * Release list header row: registry id | published.
 * Hidden until `sm` so mobile matches browse (no floating column titles).
 */
export const registry_feed_header_grid =
  'hidden grid-cols-[minmax(0,1fr)_auto] gap-x-6 border-b border-border py-2.5 sm:grid sm:py-3';

/**
 * Publish composer header: source bundle | release identity.
 * Same rhythm as {@link registry_feed_header_grid}, wider right column for fields.
 */
export const registry_feed_publish_header_grid =
  'hidden grid-cols-[minmax(0,1fr)_minmax(13rem,19rem)] gap-x-6 border-b border-border py-2.5 sm:grid sm:py-3';

/** Inputs that sit in feed rows — underline only, no card chrome. */
export const registry_feed_field_input =
  'h-10 w-full rounded-none border-0 border-b border-border bg-transparent px-0 py-1 font-mono text-[13.5px] tabular shadow-none transition-[border-color,color] duration-200 ease-out placeholder:text-muted-foreground/55 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

/** Vertical space between feed body and footer or empty blocks. */
export const registry_feed_y_gutter = 'py-7 sm:py-9';

/** Empty state: centered copy only (no dashed panel). */
export const registry_empty_simple =
  'mx-auto grid max-w-md justify-items-center gap-2.5 py-14 text-center sm:py-16';

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
