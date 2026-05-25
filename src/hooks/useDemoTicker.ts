import { useEffect, useRef } from 'react';

/**
 * Lightweight "demo is alive" ticker.
 *
 * Calls `tick` at a randomized cadence between `minMs` and `maxMs` so the
 * mock analytics pages feel live without locking into a regular pulse.
 *
 * Pauses automatically when the tab is hidden so background tabs don't
 * accumulate fake events.
 */
export function useDemoTicker(
  tick: () => void,
  options: { minMs?: number; maxMs?: number; enabled?: boolean } = {},
) {
  const { minMs = 6000, maxMs = 12000, enabled = true } = options;
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!enabled) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const schedule = () => {
      const delay = Math.round(minMs + Math.random() * Math.max(0, maxMs - minMs));
      timeout = setTimeout(() => {
        if (cancelled) return;
        if (typeof document === 'undefined' || !document.hidden) {
          try {
            tickRef.current();
          } catch {
            // Swallow demo errors so the page stays alive.
          }
        }
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [enabled, minMs, maxMs]);
}
