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
    [BetRoundType.AUCTION]: 'bg-[#8ab400]/10 text-black border-[#8ab400]/20 hover:bg-[#8ab400]/20',
    [BetRoundType.FUTURE]: 'bg-[#e1ff80]/10 text-black border-[#e1ff80]/20 hover:bg-[#e1ff80]/20',
    [BetRoundType.OPINION]: 'bg-[#a5be55]/10 text-black border-[#a5be55]/20 hover:bg-[#a5be55]/20',
    [BetRoundType.PICK]: 'bg-[#bdff00]/10 text-black border-[#bdff00]/20 hover:bg-[#bdff00]/20',
  };
  return classes[type];
};