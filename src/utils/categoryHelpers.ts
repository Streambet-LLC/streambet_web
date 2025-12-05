import { BettingCategory } from '@/enums';

export const getCategoryLabel = (category: BettingCategory): string => {
  const labels: Record<BettingCategory, string> = {
    [BettingCategory.TRADING_CARDS]: 'Trading Cards',
    [BettingCategory.NEOSPORTS_ALTERNATIVE]: 'Alternative Sports',
    [BettingCategory.SPORTS]: 'Sports',
    [BettingCategory.STREAMING_COMPETITIONS]: 'Streaming Competitions',
    // HOTFIX: Temporarily removed from UI - backend still supports this
    // [BettingCategory.EMERGING_SPORTS]: 'Emerging Sports',
    [BettingCategory.OTHER]: 'Other',
  };
  return labels[category];
};
