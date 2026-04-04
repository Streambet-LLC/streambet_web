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
        Buy cards on CardCade in an easier, friendlier, more transparent, more fun manner than anywhere else on the internet!
      </>
    ),
  },
  {
    title: 'Sell Cards',
    trailWord: 'SELL',
    description: (
      <>
        List/sell cards on CardCade with lower fees, full security provisioning, and full support of our team.
      </>
    ),
  },
  {
    title: 'Win Along The Way',
    trailWord: 'FUN',
    description: (
      <>
        Win prizes along the way by accumulating CadeCoins from buying, selling, and participating in predictions & games. The more you buy and sell, the higher your discount tier climbs. As you level up, your seller fee can drop from 4% to 2% so you keep more on every sale.
      </>
    ),
  },
];
