export interface BetCard {
  thumbnail: string;
  name: string;
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
  setQuickPick: (streamId: string, roundId: string, streamName: string) => void,
}