import { BetRoundType, BettingCategory } from '@/enums';

export const getCategoryLabel = (category: BettingCategory): string => {
  const labels: Record<BettingCategory, string> = {
    // [BettingCategory.TRADING_CARDS]: 'Trading Cards',
    // [BettingCategory.NEOSPORTS_ALTERNATIVE]: 'Alternative Sports',
    [BettingCategory.POKEMON_CARDS]: 'Pokemon Cards',
    [BettingCategory.ONE_PIECE]: 'One Piece',
    [BettingCategory.SPORTS_CARDS]: 'Sports Cards',
    // [BettingCategory.SPORTS]: 'Sports',
    // [BettingCategory.STREAMING_COMPETITIONS]: 'Streaming Competitions',
    // HOTFIX: Temporarily removed from UI - backend still supports this
    // [BettingCategory.EMERGING_SPORTS]: 'Emerging Sports',
    [BettingCategory.OTHER]: 'Other',
  };
  return labels[category];
};

export const getTypeLabel = (type: BetRoundType): string => {
  const labels: Record<BetRoundType, string> = {
    [BetRoundType.AUCTION]: 'Auctions',
    [BetRoundType.FUTURE]: 'Futures',
    [BetRoundType.OPINION]: 'Opinions',
    [BetRoundType.PICK]: 'Picks',
  };
  return labels[type];
};
