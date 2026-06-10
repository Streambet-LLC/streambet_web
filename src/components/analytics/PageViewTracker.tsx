import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/mixpanel';

/**
 * Fires a Mixpanel "Page Viewed" event on every route change. Rendered once
 * inside <BrowserRouter>. No UI. Tracks the path only (no query string, to
 * avoid leaking tokens/ids into analytics property cardinality).
 */
export default function PageViewTracker(): null {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
