import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps a tabbed screen's active tab in the URL as `?tab=`.
 *
 * The reason is not polish: retired routes redirect *into* a specific tab
 * (`/curriculum` → `/catalogue?tab=curriculum`), and without the tab in the URL
 * there is no way to express where a redirect should land. Shareable links and a
 * working back button come along for free.
 *
 * An unrecognised or absent value falls back rather than rendering an empty
 * screen — the query string is user-editable, so it is untrusted input.
 *
 * Writes with `replace`, so flipping through tabs does not bury the page the
 * user arrived from under a stack of history entries.
 *
 * Deliberately NOT part of the design system: `ds/navigation/Tabs` is a plain
 * controlled component with no router dependency, and giving it one would make
 * the whole DS unusable outside react-router.
 *
 * `paramName` lets a tabbed screen nest inside another tabbed screen without the
 * two fighting over the same query key — the level hub keeps its tab in `?tab=`
 * and its embedded catalogue in `?cat=`. It defaults to `tab`, so every existing
 * caller is unchanged.
 */
export function useTabParam<T extends string>(
  keys: readonly T[],
  fallback: T,
  paramName = 'tab',
): [T, (key: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(paramName);
  const active = keys.includes(raw as T) ? (raw as T) : fallback;

  const select = useCallback(
    (key: T) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set(paramName, key);
          return next;
        },
        { replace: true },
      );
    },
    [setParams, paramName],
  );

  return [active, select];
}
