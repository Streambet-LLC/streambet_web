export interface BetCard {
  thumbnail: string;
  name: string;
  options: {
    option: string;
    percentage: number;
    selected?: boolean;
  }[];
  totalPot: {
    streamCoins: number;
    goldCoins: number;
  },
  creator: string | null;
  streamId: string | null;
  streamName: string | null;
  type: string | null;
}