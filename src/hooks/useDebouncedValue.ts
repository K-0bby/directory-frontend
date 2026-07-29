import { useEffect, useState } from "react";

/**
 * Returns a copy of `value` that only updates after it has stopped changing
 * for `delayMs`.
 *
 * Use this for the value a data-fetching effect depends on when that value is
 * driven by a text input. Without it, search-as-you-type fires one request per
 * keystroke, which trips the backend's rate limit (HTTP 429) mid-word.
 *
 * Note this is deliberately separate from nuqs's `limitUrlUpdates`/`debounce`
 * option: that only rate-limits writes to the URL, while the hook still
 * returns each new value immediately so the input stays responsive. Debouncing
 * the fetch therefore has to happen here, on the value itself.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
