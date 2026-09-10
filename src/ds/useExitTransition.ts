import { useCallback, useEffect, useRef, useState } from 'react';

/** Milliseconds the exit animation runs. Mirrors --dur-base in tokens.css.
 *  Read from the CSS variable so the two never drift; falls back if unset. */
function exitMs(): number {
  if (typeof window === 'undefined') return 180;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur-base').trim();
  const ms = raw.endsWith('ms') ? parseFloat(raw) : raw.endsWith('s') ? parseFloat(raw) * 1000 : NaN;
  return Number.isFinite(ms) ? ms : 180;
}

/** Drives an element's exit: holds it mounted through a `closing` phase, plays a
 *  reverse animation, then calls the real `onClose`. Without this, a component
 *  that animates in but unmounts synchronously pops out — nothing in the real
 *  world vanishes to nothing.
 *
 *  Only usable where the component controls every dismiss path (a Toast's timer
 *  and ✕, a Dialog's Escape/scrim/✕). A close triggered by consumer-rendered
 *  footer buttons bypasses this and unmounts directly.
 *
 *  Under `prefers-reduced-motion` the durations token is zeroed, so we close on
 *  the next frame rather than waiting on an animation that never runs. */
export function useExitTransition(onClose?: () => void, durationMs?: number) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const requestClose = useCallback(() => {
    if (!onClose) return;
    if (closing) return; // a second Escape/click while already leaving is a no-op
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setClosing(true);
    timer.current = window.setTimeout(onClose, reduced ? 0 : (durationMs ?? exitMs()));
  }, [onClose, closing, durationMs]);

  return { closing, requestClose };
}
