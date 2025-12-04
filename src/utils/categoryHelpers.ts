import { BettingCategory } from '@/enums';

export const getCategoryLabel = (category: BettingCategory): string => {
  const labels: Record<BettingCategory, string> = {
    [BettingCategory.TRADING_CARDS]: 'Trading Cards',
    [BettingCategory.NEOSPORTS_ALTERNATIVE]: 'Neosports Alternative',
    [BettingCategory.SPORTS]: 'Sports',
    [BettingCategory.STREAMING_COMPETITIONS]: 'Streaming Competitions',
    [BettingCategory.OTHER]: 'Other',
  };
  return labels[category];
};
