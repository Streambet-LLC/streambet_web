/**
 * Which site this page load is: the main collectIQ site, or the standalone
 * Hermes Auctions buyer site.
 *
 * The standalone site is the same build served from `hermes.html` (its own
 * title, favicon and link-preview tags, and `<meta name="app-site"
 * content="hermes">`). Point a domain's CloudFront distribution at that file
 * and the whole app runs as Hermes Auctions there. See
 * docs/HERMES_AUCTIONS_DOMAIN.md.
 *
 * Preview it on any host with `?site=hermes` (sticks for the tab session);
 * `?site=main` switches back.
 */

const PREVIEW_KEY = 'hermes_site_preview';

function detectHermesSite(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const p = new URLSearchParams(window.location.search).get('site');
    if (p === 'hermes') sessionStorage.setItem(PREVIEW_KEY, '1');
    else if (p === 'main') sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    // Storage blocked: the URL flag still works for this load.
  }
  const meta = document.querySelector('meta[name="app-site"]')?.getAttribute('content');
  if (meta === 'hermes') return true;
  try {
    return (
      sessionStorage.getItem(PREVIEW_KEY) === '1' ||
      new URLSearchParams(window.location.search).get('site') === 'hermes'
    );
  } catch {
    return new URLSearchParams(window.location.search).get('site') === 'hermes';
  }
}

/** True when this page load is the standalone Hermes Auctions site. */
export const IS_HERMES_SITE = detectHermesSite();

/**
 * The auctions marketplace. `/` on both sites: on collectiqapp.xyz, Hermes
 * Auctions is the first tab and the home page. `/auctions` redirects here.
 */
export const HERMES_HOME = '/';

/** Brand for shared pages (log in, password reset) on whichever site this is. */
export const SITE_BRAND = IS_HERMES_SITE
  ? { name: 'Hermes Auctions', logo: '/hermes/hermes-auctions-logo.png', logoClass: 'h-10' }
  : { name: 'collectIQ', logo: '/collectiq-mark.png', logoClass: 'h-8' };

/**
 * Title + favicon for the Hermes site. `hermes.html` already has them; this
 * covers the `?site=hermes` preview, which loads the main `index.html`.
 */
export function applyHermesDocumentBranding(): void {
  if (!IS_HERMES_SITE || typeof document === 'undefined') return;
  if (!document.title.startsWith('Hermes')) document.title = 'Hermes Auctions';
  const icons = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="icon"], link[rel="apple-touch-icon"]'
  );
  icons.forEach(link => {
    if (link.href.includes('/hermes/')) return;
    link.href =
      link.rel === 'apple-touch-icon'
        ? '/hermes/hermes-mark-192.png'
        : '/hermes/hermes-mark-64.png';
    link.type = 'image/png';
  });
}
