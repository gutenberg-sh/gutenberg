import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, set_debounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => set_debounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
