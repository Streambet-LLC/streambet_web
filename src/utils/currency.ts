export const getCurrencyLabel = (currencyType: string): string => {
  switch (currencyType) {
    case 'gold_coins':
      return 'Gold Coin(s)';
    case 'cade_coins':
      return 'CadeCoins';
    case 'sweep_coins':
    case 'stream_coins':
      return 'Stream Coin(s)';
    case 'free_tokens':
      return 'Free Tokens';
    default:
      return 'Unknown Currency';
  }
};
