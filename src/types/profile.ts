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
  title?: string;
  badgeLevel?: string;
  isCreator?: boolean;
  isProSubscriber?: boolean;
  isSeller?: boolean;
  listedItemCount?: number;
  city?: string;
  state?: string;
  country?: string;
  collectionPreferences?: string[];
  effectiveSellerFeePercent?: number;
}
