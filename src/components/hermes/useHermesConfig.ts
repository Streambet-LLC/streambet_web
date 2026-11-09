import { useQuery } from '@tanstack/react-query';
import { hermesAPI, type PremiumRates } from '@/integrations/api/hermes';
import { premiumRates } from './format';

/** Public Hermes config (crypto rail + fees), shared cache with the auction page. */
export function useHermesConfig() {
  return useQuery({
    queryKey: ['hermes-config'],
    queryFn: hermesAPI.config,
    staleTime: 60_000,
  });
}

/** Buyer fee by tender for new lots (card / ACH / USDC), for site-wide copy. */
export function useBuyerFeeRates(): PremiumRates {
  return premiumRates(useHermesConfig().data?.fees);
}
