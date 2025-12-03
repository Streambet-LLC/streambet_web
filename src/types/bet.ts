export interface BetCard {
  thumbnail: string;
  name: string;
  lockDate?: string;
  description: string;
  options: {
    option: string;
    percentage: number;
    selected?: boolean;
    isWinner: boolean;
  }[];
  totalPot: {
    streamCoins: number;
    goldCoins: number;
  },
  creator: string | null;
  streamId: string | null;
  roundId: string | null;
  streamName: string | null;
  type: string | null;
  status?: string | null;
  streamStatus?: string | null;
  scheduledStartTime?: string | null;
  isForStream?: boolean;
  setQuickPick: (streamId: string, roundId: string, streamName: string, selectedId: string | null) => void,
}