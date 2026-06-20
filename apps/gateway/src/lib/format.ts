/** Shown when a numeric or text value is missing in the UI. */
export const format_empty = '-';

export function format_bytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return format_empty;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function format_relative_time(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;

  const now = Date.now();
  const diff_seconds = Math.round((then - now) / 1000);
  const abs = Math.abs(diff_seconds);

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (abs < 60) return formatter.format(diff_seconds, 'second');
  if (abs < 3_600)
    return formatter.format(Math.round(diff_seconds / 60), 'minute');
  if (abs < 86_400)
    return formatter.format(Math.round(diff_seconds / 3_600), 'hour');
  if (abs < 86_400 * 30)
    return formatter.format(Math.round(diff_seconds / 86_400), 'day');
  if (abs < 86_400 * 365)
    return formatter.format(Math.round(diff_seconds / (86_400 * 30)), 'month');

  return formatter.format(Math.round(diff_seconds / (86_400 * 365)), 'year');
}

export function format_date_short(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function shorten(value: string, head = 6, tail = 6): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function format_count(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return format_empty;
  if (value < 1_000) return value.toLocaleString();
  if (value < 10_000) return value.toLocaleString();
  if (value < 1_000_000)
    return `${(value / 1_000).toFixed(value < 10_000 ? 2 : 1)}k`;
  return `${(value / 1_000_000).toFixed(2)}M`;
}
