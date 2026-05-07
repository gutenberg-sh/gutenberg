/**
 * Shared modal overlay layout — wallet picker, tip publisher, etc.
 * Pair {@link overlay_scrim} with a `z-*` class on the same element for stacking.
 */
export const overlay_scrim =
  'fixed inset-0 flex items-center justify-center bg-background/80 p-4';

/** Narrow modal panel (wallet list, tip flow). */
export const overlay_panel =
  'relative flex w-full max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg';

/** Wide modal panel. */
export const overlay_panel_lg =
  'relative w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card p-4 shadow-lg';
