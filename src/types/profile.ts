export interface PrizeProgress {
  lifetimeCoinsEarned: number;
  nextPrize: number | null;
  nextPrizeName: string | null;
  progressPercent: number;
  allPrizes: Array<{
    amount: number;
    name: string;
    achieved: boolean;
  }>;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  name: string;
  accountCreationDate: Date;
  profileImageUrl: string;
  socials: { [social: string]: string } | null;
  role: string;
  isFollowed: boolean;
  followers: number;
  currentCadeCoins: number;
  lifetimeCadeCoins: number;
  title: string;
  badgeLevel: string;
  prizeProgress: PrizeProgress;
  isCreator?: boolean;
}
