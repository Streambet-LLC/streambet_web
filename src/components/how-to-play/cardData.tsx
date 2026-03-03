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
        Buy cards at CardCade in an easier, friendlier, more transparent, and more fun manner than anywhere else on the internet!
      </>
    ),
  },
  {
    title: 'Sell Cards',
    trailWord: 'SELL',
    description: (
      <>
        List/sell cards at CardCade with lower fees, full security provisioning, and full support of our team.
      </>
    ),
  },
  {
    title: 'Win Along The Way',
    trailWord: 'FUN',
    description: (
      <>
        Win prizes along the way by accumulating CadeCoins from buying, selling, and participating in predictions & games.
      </>
    ),
  },
];
