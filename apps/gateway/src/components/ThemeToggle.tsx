import { Monitor, Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { applyStoredTheme, getThemeMode, type ThemeMode } from '@/lib/theme';

/**
 * Cycles: system → light → dark → system. Lets users return to OS preference.
 */
export function ThemeToggle() {
  const [mode, set_mode] = useState<ThemeMode>(() => getThemeMode());

  const sync = useCallback(() => {
    set_mode(getThemeMode());
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  const cycle = useCallback(() => {
    if (mode === 'system') {
      applyStoredTheme('light');
    } else if (mode === 'light') {
      applyStoredTheme('dark');
    } else {
      applyStoredTheme('system');
    }
    sync();
  }, [mode, sync]);

  const label =
    mode === 'system'
      ? 'Color theme: System. Click to use light.'
      : mode === 'light'
        ? 'Color theme: Light. Click to use dark.'
        : 'Color theme: Dark. Click to use system setting.';

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex size-9 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={label}
      title={label}
    >
      {mode === 'system' ? (
        <Monitor className="size-4" strokeWidth={1.75} aria-hidden />
      ) : mode === 'light' ? (
        <Sun className="size-4" strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon className="size-4" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
