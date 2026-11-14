import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/mixpanel';
import { pixelPageView } from '@/lib/metaPixel';

/**
 * Fires a Mixpanel "Page Viewed" event on every route change, and the Meta
 * Pixel PageView for SPA navigations (the pixel's base code only sees the
 * first load). Rendered once inside <BrowserRouter>. No UI. Mixpanel gets the
 * path only (no query string, to avoid leaking tokens/ids into analytics
 * property cardinality).
 */
export default function PageViewTracker(): null {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
    pixelPageView();
  }, [location.pathname]);

  return null;
}
