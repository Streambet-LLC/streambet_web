import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, X, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import api from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';
import { useStripeStatus, isStripePending } from '@/hooks/useStripeStatus';

/**
 * Banner shown to approved sellers who haven't completed Stripe onboarding.
 * Displays at the top of every page via MainLayout.
 *
 * Dismissal is persisted in localStorage keyed by the current onboarding
 * status (e.g. "none" vs "pending"). When the underlying status changes
 * — for example, the user finally submits Stripe details and moves from
 * "none" to "pending" — the banner re-appears so we can announce the new
 * state, but we won't nag them about the same state twice.
 */
const DISMISS_STORAGE_KEY = 'sellerOnboardingBannerDismissed';

type BannerStatus = 'none' | 'pending';

export const SellerOnboardingBanner = () => {
  const { session } = useAuthContext();
  const [dismissedKey, setDismissedKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(DISMISS_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Live Stripe status — lets us show "Pending Stripe Review" instead of
  // "Complete Onboarding" when the user has submitted their details but
  // Stripe hasn't fully enabled charges/payouts yet.
  const isCandidate = !!session && !!session.isSeller && !session.sellerOnboardingCompleted;
  const { data: stripeStatus } = useStripeStatus(isCandidate);
  const pending = isStripePending(stripeStatus);

  const status: BannerStatus = pending ? 'pending' : 'none';
  const dismissKey = session?.id ? `${session.id}:${status}` : null;
  const isDismissed = !!dismissKey && dismissedKey === dismissKey;

  // If the status changed since the user last dismissed (e.g. they
  // submitted Stripe details and moved from "none" -> "pending"), clear
  // the stored dismissal so the banner shows the new state.
  useEffect(() => {
    if (!dismissKey) return;
    if (dismissedKey && dismissedKey !== dismissKey) {
      try {
        window.localStorage.removeItem(DISMISS_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setDismissedKey(null);
    }
  }, [dismissKey, dismissedKey]);

  if (!isCandidate || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    if (!dismissKey) return;
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, dismissKey);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
    setDismissedKey(dismissKey);
  };

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
          <span className="font-semibold">
            {pending ? 'Stripe is reviewing your account.' : 'Finish setting up your shop!'}
          </span>{' '}
          <span className="hidden sm:inline">
            {pending
              ? "We'll enable payments as soon as Stripe finishes verification. You can check status or update info anytime."
              : 'Complete Stripe onboarding to start accepting payments from buyers.'}
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
          ) : pending ? (
            <Clock className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          )}
          {loading ? 'Redirecting…' : pending ? 'Pending Stripe Review' : 'Complete Onboarding'}
        </Button>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-yellow-400/60 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
