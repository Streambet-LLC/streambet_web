import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface InfoCard {
  title: string;
  trailWord: string;
  description: ReactNode;
}

export const infoCards: InfoCard[] = [
  {
    title: 'Getting Started',
    trailWord: 'START',
    description: (
      <>
        CardCade.fun is 100% free to play. To get started, create an account and then you will
        receive 100 coins to get started with.
      </>
    ),
  },
  {
    title: 'Make Picks',
    trailWord: 'PICK',
    description: (
      <>
        Make your picks on prediction cards throughout the site -- whatever floats your boat..
        TCG auctions, sports cards sales, collectibles events, competitions, macro happenings, and
        much more.
      </>
    ),
  },
  {
    title: 'Earn CadeCoins + Prizes',
    trailWord: 'WIN',
    description: (
      <>
        Every win (correct picks) earns you CadeCoins -- CadeCoins are directly redeemable for
        trading card prizes.. think of it like you're at the arcade, and earned enough tokens to
        go collect your prize!
      </>
    ),
  },
  {
    title: 'Redeem your CCs for Prizes',
    trailWord: 'CLAIM',
    description: (
      <>
        Just hop over to the{' '}
        <Link to="/prizes" className="text-primary hover:underline">
          Prizes page
        </Link>{' '}
        to redeem your prizes and select what type of booster or card you would like, and we'll
        get it shipped out to you right away!
      </>
    ),
  },
  {
    title: 'What if I run out of CadeCoins?',
    trailWord: 'REFILL',
    description: (
      <>
        If you deplete to zero CadeCoins.. don't worry! Just email us at{' '}
        <a href="mailto:info@streambet.tv" className="text-primary hover:underline">
          info@streambet.tv
        </a>{' '}
        and we'll refill your balance to 100, so you can keep playing.
      </>
    ),
  },
  {
    title: 'Evolve to real $',
    trailWord: 'LEVEL UP',
    description: (
      <>
        For users 21 years or older, if you're feeling extra frisky, feel free to hop over to{' '}
        <a
          href="https://pro.cardcade.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          CardCade Pro
        </a>{' '}
        for real-$ picks experiences.
      </>
    ),
  },
  {
    title: 'Get Started!',
    trailWord: 'GO',
    description: (
      <>
        Check out Featured Picks on the home page, follow your favorite creators, and jump into
        live streams to start making predictions. The more you play, the more you win!
      </>
    ),
  },
];
