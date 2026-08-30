import { useEffect, useState } from 'react';

/** Returns `value` delayed until it has stopped changing for `delayMs`.
 *
 *  A search box drives a network query on every keystroke otherwise; debouncing
 *  the term means one request per pause, not one per letter. The timer resets on
 *  each change and is cleared on unmount, so no stale write lands after the
 *  component is gone. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
