const THEME_STORAGE_KEY = 'gutenberg-theme';

export type ThemeMode = 'light' | 'dark' | 'system';

type StoredTheme = 'light' | 'dark';

function get_stored_theme(): StoredTheme | null {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  return null;
}

export function getThemeMode(): ThemeMode {
  return get_stored_theme() ?? 'system';
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
