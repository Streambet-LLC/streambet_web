import { BetRoundType } from '@/enums';

export const getBetRoundTypeLabel = (type: BetRoundType): string => {
  const labels: Record<BetRoundType, string> = {
    [BetRoundType.AUCTION]: 'AUCTION',
    [BetRoundType.FUTURE]: 'FUTURE',
    [BetRoundType.OPINION]: 'OPINION',
    [BetRoundType.PICK]: 'PICK',
  };
  return labels[type];
};
