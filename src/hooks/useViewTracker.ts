import { useEffect, useRef } from 'react';
import { prizeAPI } from '@/integrations/api/client';

/**
 * Best-effort, batched item-view tracker.
 *
 * Each call to `trackView(itemId)` adds the id to an in-memory buffer.
 * The buffer is flushed:
 *   - automatically every `FLUSH_INTERVAL_MS`
 *   - when the page becomes hidden (visibilitychange)
 *   - on hook unmount
 *
 * Per-day dedup is enforced by the backend (`prize_item_views` partial
 * unique indexes), so it is safe to send the same id many times. We
 * still dedupe in-memory to keep the request payload small.
 *
 * Anonymous viewers are identified by the `x-anon-id` request header
 * which the api client always attaches.
 */

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH = 50;

// Module-level buffer so multiple component instances share one stream.
const buffer = new Set<string>();
// IDs already sent during this page lifetime — additional sends within
// the same session are pointless.
const sentThisSession = new Set<string>();
let flushTimer: ReturnType<typeof setInterval> | null = null;
let listenersAttached = false;

const flush = () => {
  if (buffer.size === 0) return;
  const ids: string[] = [];
  for (const id of buffer) {
    if (sentThisSession.has(id)) continue;
    ids.push(id);
    if (ids.length >= MAX_BATCH) break;
  }
  // Clear what we're about to send (keep anything we trimmed for next tick).
  ids.forEach(id => {
    buffer.delete(id);
    sentThisSession.add(id);
  });
  if (ids.length === 0) return;

  // Fire-and-forget; failures are non-fatal analytics events.
  prizeAPI.trackItemViews(ids).catch(() => {
    // Re-add so we try again later. Most failures will be transient.
    ids.forEach(id => {
      sentThisSession.delete(id);
      buffer.add(id);
    });
  });
};

const ensureListeners = () => {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
};

/**
 * Hook returning a `trackView` function. Components call it once when
 * their item card mounts (or whenever the prize id changes).
 */
export const useViewTracker = () => {
  // Final flush when the consuming component unmounts is helpful for
  // short-lived screens (e.g. modals).
  useEffect(() => {
    ensureListeners();
    return () => {
      flush();
    };
  }, []);

  return (itemId: string | null | undefined) => {
    if (!itemId) return;
    if (sentThisSession.has(itemId)) return;
    buffer.add(itemId);
  };
};

/** Imperative flush — useful for tests or explicit "leaving page" hooks. */
export const flushItemViews = flush;
