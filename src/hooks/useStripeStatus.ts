import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';

export interface StripeConnectStatus {
  hasStripeAccount: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  sellerOnboardingCompleted: boolean;
  stripeAccountConnected: boolean;
}

/**
 * Fetches the live Stripe Connect status for the current user.
 * Use this when an action button needs to differentiate between
 * "not started", "submitted - pending Stripe review", and "fully verified".
 */
export function useStripeStatus(enabled: boolean) {
  return useQuery<StripeConnectStatus | undefined>({
    queryKey: ['creator', 'stripe-status'],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await api.creator.getMyStripeStatus();
      return (res?.data ?? res) as StripeConnectStatus;
    },
  });
}

/**
 * Convenience: a Stripe account is "pending" when the user has submitted
 * onboarding details but Stripe hasn't fully enabled charges / payouts yet.
 */
export function isStripePending(status?: StripeConnectStatus): boolean {
  if (!status) return false;
  if (status.sellerOnboardingCompleted) return false;
  return status.detailsSubmitted && !(status.chargesEnabled && status.payoutsEnabled);
}
