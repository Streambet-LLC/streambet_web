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

export const getBetRoundTypeClass = (type: BetRoundType): string => {
  const classes: Record<BetRoundType, string> = {
    [BetRoundType.AUCTION]: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20',
    [BetRoundType.FUTURE]: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/20',
    [BetRoundType.OPINION]: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20',
    [BetRoundType.PICK]: 'bg-[#bdff00]/10 text-[#bdff00] border-[#bdff00]/20 hover:bg-[#bdff00]/20',
  };
  return classes[type];
};