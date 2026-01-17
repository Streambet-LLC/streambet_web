const CURRENCY_LABELS = {
  gold_coins: 'Gold Coin(s)',
  cade_coins: 'CadeCoins',
  sweep_coins: 'Stream Coin(s)',
  stream_coins: 'Stream Coin(s)',
  free_tokens: 'Free Tokens',
} as const;

export type CurrencyType = keyof typeof CURRENCY_LABELS;

export const getCurrencyLabel = (currencyType: string): string => {
  return CURRENCY_LABELS[currencyType as CurrencyType] ?? 'Unknown Currency';
};
