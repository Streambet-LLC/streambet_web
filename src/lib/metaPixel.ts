/**
 * Meta (Facebook/Instagram) Pixel, per the Meta tracking brief (2026-11-12).
 * The funnel is traffic → signup → watch → bid, so the site sends:
 *   PageView              every page (base code + each SPA route change)
 *   ViewContent           lot page load
 *   CompleteRegistration  account created (email or Google)
 *   Watch (custom)        lot added to the watchlist
 *   Bid (custom)          bid placed
 *
 * Rules (same as the Mixpanel wrapper):
 * - No-op until `VITE_META_PIXEL_ID` is set (SSM `/cardcade/<branch>/
 *   VITE_META_PIXEL_ID`, read at build time), so local dev and any build
 *   without an id send nothing.
 * - Never throws: analytics must not break the UI.
 * - The pixel id is public by design (it ships in every page).
 */

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const PIXEL_ID = ((import.meta.env.VITE_META_PIXEL_ID as string | undefined) ?? '').trim();

/**
 * Pages whose URL carries login tokens or OAuth codes. The pixel sends the
 * page URL with every event, so it doesn't start on these; it starts on the
 * next normal page instead (see pixelPageView).
 */
const TOKEN_PATHS = [
  '/auth/google-callback',
  '/auth/verify-email',
  '/reset-password',
  '/analytics/google/callback',
];

function onTokenPage(): boolean {
  return TOKEN_PATHS.some(p => window.location.pathname.startsWith(p));
}

let initialized = false;
/** Path of the last PageView sent, so a route change to the same path isn't counted twice. */
let lastPageViewPath: string | null = null;

/**
 * Meta's base code, unchanged apart from typing: defines `fbq` (queuing
 * calls until fbevents.js loads), loads the script, inits the pixel and
 * tracks the first PageView. Call once at startup (main.tsx).
 */
export function initMetaPixel(): void {
  if (initialized || !PIXEL_ID || typeof window === 'undefined' || onTokenPage()) return;
  try {
    if (!window.fbq) {
      const n = function (...args: unknown[]) {
        if (n.callMethod) n.callMethod(...args);
        else n.queue.push(args);
      } as Fbq;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      window.fbq = n;
      if (!window._fbq) window._fbq = n;
      const t = document.createElement('script');
      t.async = true;
      t.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const s = document.getElementsByTagName('script')[0];
      if (s?.parentNode) s.parentNode.insertBefore(t, s);
      else document.head.appendChild(t);
    }
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
    lastPageViewPath = window.location.pathname;
    initialized = true;
  } catch {
    // swallow: analytics must never break boot
  }
}

function call(...args: unknown[]): void {
  if (!initialized || !window.fbq) return;
  try {
    window.fbq(...args);
  } catch {
    /* no-op */
  }
}

/**
 * SPA route change. The first PageView comes from initMetaPixel; if the app
 * opened on a token page, the pixel starts here on the first normal page.
 */
export function pixelPageView(): void {
  if (!PIXEL_ID || typeof window === 'undefined') return;
  if (!initialized) {
    initMetaPixel();
    return;
  }
  if (onTokenPage() || window.location.pathname === lastPageViewPath) return;
  lastPageViewPath = window.location.pathname;
  call('track', 'PageView');
}

/** Lot page load. */
export function pixelViewContent(lot: { id: string; title: string }): void {
  call('track', 'ViewContent', {
    content_ids: [lot.id],
    content_type: 'product',
    content_name: lot.title,
    currency: 'USD',
  });
}

/** Account created (email sign-up submitted, or a Google sign-in that made the account). */
export function pixelCompleteRegistration(): void {
  call('track', 'CompleteRegistration', { status: true });
}

/** Lot added to the watchlist. */
export function pixelWatch(lotId: string): void {
  call('trackCustom', 'Watch', { content_ids: [lotId] });
}

/** Bid placed; `value` is the max bid the bidder submitted. */
export function pixelBid(lotId: string, value: number): void {
  call('trackCustom', 'Bid', { content_ids: [lotId], value, currency: 'USD' });
}
