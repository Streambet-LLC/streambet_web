import { PickMechanism } from '@/enums';

export const getPickMechanismLabel = (mechanism?: PickMechanism): string => {
  const labels: Record<PickMechanism, string> = {
    [PickMechanism.DEFAULT]: 'Default',
    [PickMechanism.SENTIMENT]: 'Sentiment',
  };
  return mechanism ? labels[mechanism] : 'Default';
};

export const SENTIMENT_REVEAL_RULES = [
  'Sentiment picks open for voting at the next 1500 UTC cycle.',
  'Results are hidden for the first 24 hours, then update in real time.',
  'Users can edit their pick at any time.',
  'Rewards: 10 CadeCoins within first 2 hours after reveal, 5 thereafter, none for edits.',
];

export const getSentimentRevealRulesText = (): string => {
  return SENTIMENT_REVEAL_RULES.join('\n');
};

export const MAX_SENTIMENT_OPTIONS = 5;
