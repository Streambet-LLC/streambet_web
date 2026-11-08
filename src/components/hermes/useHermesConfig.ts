import { useQuery } from '@tanstack/react-query';
import { hermesAPI } from '@/integrations/api/hermes';

/** Buyer premium for site copy until `/auctions/config` loads. Mirrors the API's `BUYER_PREMIUM_PERCENT`. */
export const DEFAULT_BUYER_PREMIUM_PERCENT = 4;

/** Public Hermes config (crypto rail + fees), shared cache with the auction page. */
export function useHermesConfig() {
  return useQuery({
    queryKey: ['hermes-config'],
    queryFn: hermesAPI.config,
    staleTime: 60_000,
  });
}

/** Buyer premium (percent) charged on new lots, for site-wide copy. */
export function useBuyerPremiumPercent(): number {
  return useHermesConfig().data?.fees?.buyerPremiumPercent ?? DEFAULT_BUYER_PREMIUM_PERCENT;
}
