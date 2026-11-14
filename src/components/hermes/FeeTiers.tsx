import { Fragment } from 'react';
import type { FundingMethod, PremiumRates } from '@/integrations/api/hermes';
import { TIER_LABEL, feeTierOrder, lowestFeeMethods } from './format';

/**
 * "5% card · 2% ACH · 2% USDC" with the cheapest tenders (ACH and USDC at
 * today's rates) in lime, so bidders spot the lower fees.
 */
export function FeeTiers({
  rates,
  methods = ['card', 'ach', 'usdc'],
}: {
  rates: PremiumRates;
  methods?: FundingMethod[];
}) {
  const low = lowestFeeMethods(rates, methods);
  return (
    <>
      {feeTierOrder(methods).map((m, i) => (
        <Fragment key={m}>
          {i > 0 && ' · '}
          <span className={low.includes(m) ? 'font-bold text-[#C7FA09]' : undefined}>
            {rates[m]}% {TIER_LABEL[m]}
          </span>
        </Fragment>
      ))}
    </>
  );
}

/** Lime "Lowest fee" pill that sits on the top edge of a Pay-with option (needs a `relative` parent). */
export function LowestFeeTag() {
  return (
    <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#C7FA09] px-1.5 py-px text-[9px] font-extrabold uppercase text-black">
      Lowest fee
    </span>
  );
}
