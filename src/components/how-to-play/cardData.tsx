import type { ReactNode } from 'react';

export interface InfoCard {
  title: string;
  trailWord: string;
  description: ReactNode;
}

export const infoCards: InfoCard[] = [
  {
    title: 'Buy Slabs',
    trailWord: 'BUY',
    description: (
      <>
        Buy trading cards in the easiest, friendliest, and cheapest manner on the internet.
      </>
    ),
  },
  {
    title: 'Sell Cards',
    trailWord: 'SELL',
    description: (
      <>
        Sell at the lowest fees around, with full security and our team's support.
      </>
    ),
  },
  {
    title: 'Win Along The Way',
    trailWord: 'FUN',
    description: (
      <>
        Earn CadeCoins (CCs) as you buy/sell/bid; CCs are redeemable for prizes and reduce seller fees.
      </>
    ),
  },
];
