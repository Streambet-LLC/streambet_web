/**
 * Signup attribution, per the Meta tracking brief (2026-11-12). Ad links
 * carry UTM params, e.g. /auctions/<id>?utm_source=meta&utm_medium=paid&
 * utm_campaign=tyranitar. On the first tagged landing we keep them in
 * localStorage (first touch wins), and the signup sends them to the API,
 * which saves them on the account (`users.signup_attribution`).
 *
 * Never throws: storage can be blocked, and attribution must never get in the
 * way of signing up.
 */

const STORAGE_KEY = 'ciq_attribution';
const PENDING_SIGNUP_KEY = 'ciq_pending_signup';

const PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
] as const;

/** The API keeps only these keys (users/signup-attribution.ts). */
const STORED_KEYS = [...PARAM_KEYS, 'landing_path', 'captured_at'] as const;
const MAX_VALUE_LENGTH = 500;

export type Attribution = Partial<Record<(typeof STORED_KEYS)[number], string>>;

/** First landing with any ad param: remember them (plus where and when). Call once at startup. */
export function captureAttribution(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    for (const k of PARAM_KEYS) {
      const v = params.get(k)?.trim();
      if (v) found[k] = v.slice(0, MAX_VALUE_LENGTH);
    }
    if (!Object.keys(found).length) return;
    found.landing_path = window.location.pathname.slice(0, MAX_VALUE_LENGTH);
    found.captured_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  } catch {
    /* storage blocked: no attribution for this visitor */
  }
}

/** What was captured, cleaned to the keys the API accepts; null if nothing. */
export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Attribution = {};
    for (const k of STORED_KEYS) {
      const v = parsed?.[k];
      if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, MAX_VALUE_LENGTH);
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/**
 * A Google sign-in just created the account. GoogleCallback reloads the page
 * right away, so the signup event and the attribution save happen after the
 * reload (PendingSignupHandler), once the pixel and session are up.
 */
export function markPendingSignup(): void {
  try {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, String(Date.now()));
  } catch {
    /* no-op */
  }
}

/** True once per pending Google signup (clears the mark). */
export function takePendingSignup(): boolean {
  try {
    const v = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!v) return false;
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    return true;
  } catch {
    return false;
  }
}
