/**
 * Anonymous viewer id used to dedupe item view events for users who are
 * not logged in. Stored in localStorage so the same browser keeps the
 * same id across sessions; the backend only uses it for 24h dedup of
 * `prize_item_views`. Sent on every API request as `x-anon-id`.
 */
const STORAGE_KEY = 'streambet.anonId';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const generateAnonId = (): string => {
  // crypto.randomUUID is available in all modern browsers; fall back to a
  // simple Math.random based generator for very old environments / SSR.
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getOrCreateAnonId = (): string => {
  if (!isBrowser) {
    return generateAnonId();
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length > 0) {
      return existing;
    }
    const created = generateAnonId();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // localStorage may be unavailable (private mode, quota); fall back to a
    // per-call value so the request still succeeds.
    return generateAnonId();
  }
};
