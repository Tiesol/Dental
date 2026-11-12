import { useEffect, useState } from 'react';

// Devuelve el valor recién cuando deja de cambiar durante `delay` ms. Para búsquedas por texto.
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
