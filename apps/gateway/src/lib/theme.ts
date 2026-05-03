export const THEME_STORAGE_KEY = 'gutenberg-theme';

export type StoredTheme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * `light` / `dark` pin the UI; `null` follows `prefers-color-scheme` (no `light`/`dark` on `<html>`).
 */
export function getStoredTheme(): StoredTheme | null {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  return null;
}

export function getThemeMode(): ThemeMode {
  return getStoredTheme() ?? 'system';
}

export function applyStoredTheme(
  mode: 'light' | 'dark' | 'system' | null,
): StoredTheme | null {
  const root = document.documentElement;
  if (mode === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    return 'light';
  }
  if (mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    return 'dark';
  }
  if (mode === 'system' || mode === null) {
    root.classList.remove('light', 'dark');
    localStorage.removeItem(THEME_STORAGE_KEY);
    return null;
  }
  return null;
}

export function isEffectiveDark(): boolean {
  const r = document.documentElement;
  if (r.classList.contains('light')) return false;
  if (r.classList.contains('dark')) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Toggle: pick the opposite of the *rendered* scheme and save it. */
export function cycleLightDarkFromEffective(): void {
  applyStoredTheme(isEffectiveDark() ? 'light' : 'dark');
}
