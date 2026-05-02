import { useEffect, useState } from 'react';

/**
 * useDebounce — Delays updating the returned value until after `delay` ms
 * have elapsed since the last change to `value`.
 *
 * Typical usage: debounce search input before triggering an API call.
 *
 * @example
 * const debouncedQuery = useDebounce(query, 300);
 * useEffect(() => { fetchResults(debouncedQuery); }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
