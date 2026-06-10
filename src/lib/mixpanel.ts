import mixpanel, { type Dict } from 'mixpanel-browser';

/**
 * Client-side Mixpanel wrapper.
 *
 * Responsibilities are split with the server: the **server** owns money/outcome
 * truth (purchases, settlements, auction wins, accepted offers) so those are
 * never lost to ad-blockers; the **client** owns intent/funnel events (page
 * views, started checkout, placed bid, made offer) and identity.
 *
 * Rules:
 * - No-op when `VITE_MIXPANEL_TOKEN` is unset, so local dev runs clean.
 * - Never throws — analytics must not break the UI.
 * - `distinct_id` is the CardCade user UUID (via identify), matching the
 *   server's distinctId so events land on one profile.
 */

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;

let initialized = false;

/** production | staging | development — lets dev/staging be filtered in dashboards. */
function resolveEnvironment(): string {
  if (typeof window === 'undefined') return 'development';
  const host = window.location.hostname;
  if (host === 'cardcade.fun') return 'production';
  if (host.includes('stag')) return 'staging';
  if (host === 'localhost' || host === '127.0.0.1') return 'development';
  return 'development';
}

/**
 * Canonical client event names. Server-owned events (Purchase Completed, etc.)
 * live in the API catalog and are intentionally NOT duplicated here.
 */
export const MixpanelEvent = {
  PAGE_VIEWED: 'Page Viewed',
  LOGGED_IN: 'Logged In',
  SIGNUP_SUBMITTED: 'Signup Submitted',
  SHOP_ITEM_VIEWED: 'Shop Item Viewed',
  CHECKOUT_STARTED: 'Checkout Started',
  BID_PLACED: 'Bid Placed',
  OFFER_MADE: 'Offer Made',
  WATCHLIST_ADDED: 'Watchlist Item Added',
} as const;

export type MixpanelEventName =
  (typeof MixpanelEvent)[keyof typeof MixpanelEvent];

/** Call once at app startup (main.tsx). Safe to call repeatedly. */
export function initMixpanel(): void {
  if (initialized || !TOKEN) return;
  try {
    const environment = resolveEnvironment();
    mixpanel.init(TOKEN, {
      // Capture pageviews ourselves via the router hook for richer props.
      track_pageview: false,
      persistence: 'localStorage',
      // Modern simplified ID merge: identify() merges the anonymous
      // device id into the user profile automatically.
      debug: environment === 'development',
    });
    mixpanel.register({ app_environment: environment, source: 'web' });
    initialized = true;
  } catch {
    // swallow — analytics must never break boot
  }
}

/** Tie the current (and prior anonymous) activity to a CardCade user. */
export function identifyUser(user: {
  id: string;
  email?: string;
  username?: string;
  isSeller?: boolean;
  role?: string;
}): void {
  if (!initialized || !user?.id) return;
  try {
    mixpanel.identify(user.id);
    mixpanel.people.set({
      $email: user.email,
      $name: user.username,
      username: user.username,
      isSeller: !!user.isSeller,
      role: user.role,
    });
  } catch {
    /* no-op */
  }
}

/** Clear identity on logout so the next user starts a fresh anonymous id. */
export function resetMixpanel(): void {
  if (!initialized) return;
  try {
    mixpanel.reset();
  } catch {
    /* no-op */
  }
}

/** Track a funnel/intent event. */
export function track(
  event: MixpanelEventName,
  properties?: Dict,
): void {
  if (!initialized) return;
  try {
    mixpanel.track(event, properties);
  } catch {
    /* no-op */
  }
}

/** Convenience for route-change page views. */
export function trackPageView(path: string, properties?: Dict): void {
  track(MixpanelEvent.PAGE_VIEWED, { path, ...properties });
}
