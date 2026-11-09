import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import Analytics from './Analytics';
import Waitlist from './Waitlist';

/**
 * The "collectIQ Analytics" tab (`/analytics`). Admins get the dashboard.
 * Everyone else gets the collectIQ product page with the waitlist, since
 * analytics is still in private beta.
 */
export default function AnalyticsTab() {
  const { session, isLoading } = useAuthContext();
  if (isLoading && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return session?.role === 'admin' ? <Analytics /> : <Waitlist />;
}
