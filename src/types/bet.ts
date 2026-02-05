import { BetRoundType, BettingCategory, CurrencyType } from '@/enums';

export interface BetCard {
  thumbnail: string;
  name: string;
  lockDate?: string;
  description: string;
  category: BettingCategory;
  options: {
    id: string;
    option: string;
    percentage: number;
    isWinner: boolean;
    userBet: {
      amount: number;
      currency: CurrencyType;
    } | null;
  }[];
  totalPot: {
    streamCoins: number;
    goldCoins: number;
    cadeCoins: number;
  },
  cadeCoinUsersCount?: number;
  creator: string | null;
  streamId?: string | null;
  roundId?: string | null;
  streamName: string | null;
  type: string | null;
  betRoundType: BetRoundType;
  status?: string | null;
  streamStatus?: string | null;
  scheduledStartTime?: string | null;
  isForStream?: boolean;
  isForNonVideo?: boolean;
  isFeatured?: boolean;
  setQuickPick?: (streamId: string, roundId: string, streamName: string, selectedId: string | null, description?: string) => void,
}