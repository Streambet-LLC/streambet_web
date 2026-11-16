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

/**
 * True once the config has loaded and says the USDC rail is off (prod until
 * the mainnet escrow ships), so the fee copy can say "USDC coming soon"
 * instead of implying bidders can pay in USDC today.
 */
export function useUsdcComingSoon(): boolean {
  const { data } = useHermesConfig();
  return !!data && !data.crypto?.enabled;
}

/** Buyer fee by tender for new lots (card / ACH / USDC), for site-wide copy. */
export function useBuyerFeeRates(): PremiumRates {
  return premiumRates(useHermesConfig().data?.fees);
}
