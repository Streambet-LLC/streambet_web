import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, ExternalLink, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import api from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';

/**
 * Banner shown to approved sellers who haven't completed Stripe onboarding.
 * Displays at the top of every page via MainLayout.
 *
 * Dismissal is per-route only: the banner re-appears every time the user
 * navigates to a new page, ensuring they can't permanently miss it.
 */
export const SellerOnboardingBanner = () => {
  const { session } = useAuthContext();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset dismissal on every route change so the user keeps seeing it
  useEffect(() => {
    setDismissed(false);
  }, [location.pathname]);

  // Only show for approved sellers who haven't finished Stripe onboarding
  if (!session || !session.isSeller || session.sellerOnboardingCompleted || dismissed) {
    return null;
  }

  const handleStartOnboarding = async () => {
    setLoading(true);
    try {
      const data = await api.creator.generateAccountLink();
      const url = typeof data === 'string' ? data : (data?.data ?? data?.url);
      if (!url) throw new Error('No onboarding URL returned');
      window.location.replace(url);
    } catch {
      toast({
        title: 'Unable to start onboarding',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-yellow-500/15 border-b border-yellow-500/30 px-3 py-2 sm:px-4 sm:py-3">
      <div className="max-w-screen-xl mx-auto flex items-center gap-2 sm:gap-3">
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 shrink-0" />

        <p className="flex-1 text-xs sm:text-sm text-yellow-200 min-w-0">
          <span className="font-semibold">Finish setting up your shop!</span>{' '}
          <span className="hidden sm:inline">
            Complete Stripe onboarding to start accepting payments from buyers.
          </span>
        </p>

        <Button
          size="sm"
          variant="outline"
          className="border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/20 hover:text-yellow-100 shrink-0 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
          onClick={handleStartOnboarding}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          )}
          {loading ? 'Redirecting…' : 'Complete Onboarding'}
        </Button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md text-yellow-400/60 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
