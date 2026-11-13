import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/integrations/api/client';
import { getAttribution, takePendingSignup } from '@/lib/attribution';
import { pixelCompleteRegistration } from '@/lib/metaPixel';

/**
 * Finishes a Google sign-up that created the account: GoogleCallback marks
 * it and reloads, and once the session is back this fires the Meta
 * CompleteRegistration event and saves the first-touch ad attribution on the
 * account (email sign-ups send it with the register call instead).
 * Mounted once, app-wide. No UI.
 *
 * It waits until we're off the callback page: the session can already load
 * there (the tokens are stored before it's fetched), but the Pixel stays off
 * on that page because its URL carries the tokens.
 */
export default function PendingSignupHandler(): null {
  const { session } = useAuthContext();
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/auth/google-callback')) return;
    if (!session?.user?.id || !takePendingSignup()) return;
    pixelCompleteRegistration();
    const attribution = getAttribution();
    if (attribution) {
      // Best effort: a failure only loses the tag, never the account.
      api.auth.saveSignupAttribution(attribution).catch(() => undefined);
    }
  }, [session?.user?.id, pathname]);
  return null;
}
