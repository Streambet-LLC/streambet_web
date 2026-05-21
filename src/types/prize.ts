/**
 * Prize system types matching backend DTOs
 */

export type PrizeBrand = 'pokemon' | 'one_piece' | 'sports' | 'other';

export interface EbayListing {
  title: string | null;
  price: number | null;
  currency: string | null;
  condition: string | null;
  grade: string | null;
  imageUrl: string | null;
  itemWebUrl: string | null;
  seller: string | null;
  buyingOptions: string[];
}

export interface PsaImportResult {
  certNumber: string;
  title: string;
  brand: string | null;
  category: string | null;
  year: string | null;
  cardNumber: string | null;
  subject: string | null;
  variety: string | null;
  gradeDescription: string | null;
  cardGrade: string | null;
  description: string | null;
  imageUrls: string[];
  coverImageIndex: number;
  coverImageUrl: string | null;
  hasImages: boolean;
  psaSpecId: number | null;
  psaPopulation: {
    gradePopulation: number | null;
  } | null;
  rateLimitedUntilTomorrow: boolean;
  rateLimitedUntil: string | null;
  psaCertUrl: string;
  itemInformation: {
    certNumber: string;
    itemGrade: string | null;
    labelType: string | null;
    fugitiveInkTechnology: string | null;
    reverseCertBarcode: string | null;
    year: string | null;
    brandTitle: string | null;
    subject: string | null;
    cardNumber: string | null;
    category: string | null;
    varietyPedigree: string | null;
  };
  source: 'psa';
}

export interface ItemImage {
  id: string;
  imageUrl: string;
  displayOrder: number;
  isCover: boolean;
}

/**
 * Prize tier configuration
 * Each tier is stored as a separate row in the database
 */
export interface PrizeConfiguration {
  id: string;
  prizeTier: number;
  amount: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
  itemImages?: ItemImage[];
  coverImageId?: string | null;
  category: 'raw' | 'slab' | 'sealed' | 'other';
  grade: string | null;
  stock: number;
  purchaseOption: 'offers_only' | 'buy_only' | 'both';
  brand: PrizeBrand;
  displayOrderShop: number | null;
  sellerDisplayOrderShop: number | null;
  displayOrderRedemptions: number | null;
  featuredDisplayOrder: number | null;
  showOnRedemptions: boolean;
  showOnShop: boolean;
  sortByPurchaseOptionShop: boolean;
  sortByPurchaseOptionRedemptions: boolean;
  isActive: boolean;
  profileFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByUsername: string | null;
  createdByShopName: string | null;
  /** True if the seller has approved crypto (USDC) payments. */
  sellerCryptoEnabled?: boolean;
  updatedBy: string | null;
  ebaySearchQuery?: string | null;
  ebayMarketLastCalculatedAt?: string | null;
  showEbayAvgPublicly?: boolean;
  isProOnly: boolean;
  proEarlyAccessUntil: string | null;
  viewCount?: number;
  watcherCount?: number;
  isWatching?: boolean;
  saleType?: PrizeSaleType;
  /** Per-item shipping fee in USD. Backfilled to $5 for legacy items. */
  shippingCostUsd?: number;
  /**
   * When true, this item is sold as in-person pickup. Shipping is
   * always $0 and the checkout/offer flow skips collecting a shipping
   * address.
   */
  isInPerson?: boolean;
  auction?: AuctionSummary | null;
}

export interface EbayMarketWindowAverage {
  window: '7d' | '30d' | '90d' | '180d' | '365d' | 'all';
  averagePrice: number | null;
  soldCount: number;
}

export interface EbayMarketSummary {
  itemId: string;
  listingPrice: number | null;
  averagePrice: number | null;
  soldCountUsed: number;
  percentDifference: number | null;
  lastCalculatedAt: string | null;
  lastFetchedAt: string | null;
  totalValidSoldCount: number;
  mostRecentSalePrice: number | null;
  mostRecentSaleDate: string | null;
  windows: EbayMarketWindowAverage[];
}

export interface EbayMarketSoldListing {
  id: string;
  providerItemId: string | null;
  soldTitle: string;
  salePrice: number;
  currencySymbol: string | null;
  dateSold: string | null;
  imageUrl: string | null;
  listingUrl: string | null;
  itemCondition: string | null;
  buyingFormat: string | null;
  shippingPrice: number | null;
}

export interface AdminEbaySoldListing extends EbayMarketSoldListing {
  searchQuery: string | null;
  isInaccurate: boolean;
  inaccurateReason: string | null;
  inaccurateFlaggedByUserId: string | null;
  inaccurateFlaggedAt: string | null;
}

export interface AdminReportedEbaySoldListing extends AdminEbaySoldListing {
  itemId: string;
  itemName: string;
  itemImageUrl: string | null;
  flaggedByUsername: string | null;
  flaggedByEmail: string | null;
}

export interface EbayMarketHistory {
  itemId: string;
  summary: EbayMarketSummary;
  listings: EbayMarketSoldListing[];
}

export type PrizeSaleType = 'fixed_price' | 'auction';

export type AuctionStatus =
  | 'scheduled'
  | 'active'
  | 'ended'
  | 'paid'
  | 'unsold'
  | 'failed'
  | 'cancelled';

/**
 * Public auction summary returned alongside a Prize when its saleType is
 * `auction`. Reserve price is hidden — bidders only see `reserveMet`.
 */
export interface AuctionSummary {
  id: string;
  status: AuctionStatus;
  startsAt: string;
  endsAt: string;
  durationDays: 1 | 3 | 5 | 7;
  startingPriceUsd: number;
  currentBidUsd: number | null;
  /** Minimum increment for the next bid (dynamic by tier). */
  minNextBidIncrement: number;
  /** Minimum total amount required for the next bid. */
  minNextBidUsd: number;
  bidCount: number;
  extensionCount: number;
  /** null = no reserve set; true = reserve met; false = reserve not met. */
  reserveMet: boolean | null;
  isLeader: boolean;
  isBidder: boolean;
  /** Buyer processing fee percent applied on top of the bid (matches sales fee policy). */
  buyerProcessingFeePercent: number;
  /** Buyer processing fee in USD computed against currentBidUsd; null when no bids yet. */
  buyerProcessingFeeUsd: number | null;
  /** Total the winner would owe (bid + processing fee). null until the first bid. */
  totalDueIfWonUsd: number | null;
  /** Buyer fee for the minimum next bid — handy for the bid form preview. */
  minNextBidProcessingFeeUsd: number;
  /** Total the bidder would owe if they bid the minimum next amount. */
  minNextBidTotalUsd: number;
  /**
   * The requesting user's own proxy max on this auction. Only populated
   * when the viewer is the current leader so they can raise it. Null
   * otherwise (proxy maxes are private from other bidders).
   */
  currentUserProxyMaxUsd: number | null;
  /**
   * Per-item shipping fee in USD. Added on top of the winning bid +
   * buyer processing fee at close. Mirrors the parent prize's value
   * so the bid modal can show the full "if I win" total.
   */
  shippingCostUsd: number;
}

export interface SellerShopSummary {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  itemCount: number;
  totalViews?: number;
  totalWatchers?: number;
}

export interface SellerShopResponse {
  shop: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
    socials: { [social: string]: string } | null;
    sellerTradingExperience?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  };
  items: PrizeConfiguration[];
}

/**
 * Seller info for admin prize assignment
 */
export interface Seller {
  id: string;
  username: string;
  name: string | null;
  shopName: string | null;
}

/**
 * DTO for creating a new prize tier
 */
export interface CreatePrizeTierRequest {
  amount?: number;
  name: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  coverImageIndex?: number;
  category: 'raw' | 'slab' | 'sealed' | 'other';
  grade?: string | null;
  stock: number;
  purchaseOption: 'offers_only' | 'buy_only' | 'both';
  brand?: PrizeBrand;
  displayOrderShop?: number;
  sellerDisplayOrderShop?: number;
  displayOrderRedemptions?: number;
  featuredDisplayOrder?: number | null;
  showOnRedemptions?: boolean;
  showOnShop?: boolean;
  createdBy?: string | null;
  isProOnly?: boolean;
  /** Set to 'auction' to mark the new item as auction-eligible. After creation an admin must call api.auction.create. */
  saleType?: PrizeSaleType;
  /** Per-item shipping fee in USD. Defaults to $5 server-side if omitted. */
  shippingCostUsd?: number;
  /** When true, item is in-person pickup (shipping forced to $0, no address collected). */
  isInPerson?: boolean;
}

/**
 * DTO for updating an existing prize tier
 */
export interface UpdatePrizeTierRequest {
  amount?: number;
  name: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  coverImageIndex?: number;
  category: 'raw' | 'slab' | 'sealed' | 'other';
  grade?: string | null;
  stock: number;
  purchaseOption: 'offers_only' | 'buy_only' | 'both';
  brand?: PrizeBrand;
  displayOrderShop?: number;
  sellerDisplayOrderShop?: number;
  displayOrderRedemptions?: number;
  featuredDisplayOrder?: number | null;
  showOnRedemptions?: boolean;
  showOnShop?: boolean;
  createdBy?: string | null;
  isProOnly?: boolean;
  /** Per-item shipping fee in USD. */
  shippingCostUsd?: number;
  /** When true, item is in-person pickup. */
  isInPerson?: boolean;
}

/**
 * Prize redemption types
 */

export type PrizeCategory = 'pokemon' | 'one_piece' | 'football' | 'basketball' | 'baseball';

export enum ShippingStatus {
  OPEN = 'open',
  SHIPPED = 'shipped',
  COMPLETE = 'complete',
}

export const SHIPPING_CARRIERS = [
  'USPS',
  'UPS',
  'FedEx',
  'DHL',
  'Amazon Logistics',
  'Other',
] as const;

export type ShippingCarrier = (typeof SHIPPING_CARRIERS)[number];

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SubmitPrizeRedemptionRequest {
  prizeConfigId: string;
  prizeLevel: number;
  prizeCategory: PrizeCategory;
  shippingAddress: ShippingAddress;
}

export interface PrizeRedemptionResponse {
  id: string;
  userId: string;
  prizeConfigurationId: string;
  prizeTier: number;
  prizeCategory: string;
  dateRedeemed: string;
  shippingStatus: ShippingStatus;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  fulfilled: boolean;
  createdAt: string;
  updatedAt: string;
  prizeConfiguration?: {
    id: string;
    prizeTier: number;
    name: string;
    description: string;
    imageUrl: string;
    amount: number;
  };
}

export interface AdminPrizeRedemptionResponse {
  id: string;
  userId: string;
  prizeConfigurationId: string;
  prizeTier: number;
  prizeCategory: string;
  dateRedeemed: string;
  shippingStatus: ShippingStatus;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  fulfilled: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
    address: string;
    address2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  prizeConfiguration?: {
    id: string;
    prizeTier: number;
    name: string;
    description: string;
    imageUrl: string;
    amount: number;
  };
}

export interface UpdateRedemptionStatusRequest {
  shippingStatus: ShippingStatus;
  trackingNumber?: string;
  shippingCarrier?: string;
}

export interface UserAddress {
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
}
/**
 * Prize purchase with combined payment (coins + USD)
 * 50 Cade coins = $1
 */
export interface PrizePurchaseRequest {
  prizeConfigId: string;
  shippingAddress: ShippingAddress;
  paymentMethod: 'coins' | 'usd' | 'combined' | 'crypto';
  coinsAmount: number; // Amount of coins to use (0 for USD-only)
  usdAmount: number; // Amount in USD (0 for coins-only)
  totalPrice: number; // Total price in USD (coins converted to USD)
  discountCode?: string; // Optional discount code
}

export interface PrizeOrder {
  id: string;
  userId: string;
  prizeConfigId: string;
  shippingAddress: ShippingAddress;
  paymentMethod: 'coins' | 'usd' | 'combined' | 'crypto';
  coinsDeducted: number;
  usdCharged: number;
  totalPrice: number;
  stripePriceId?: string; // For USD payment via Stripe
  stripeSessionId?: string;
  /** Solana transaction signature when paymentMethod === 'crypto'. */
  cryptoTxSignature?: string;
  status:
    | 'pending'
    | 'buy_attempted'
    | 'payment_processing'
    | 'payment_failed'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';
  createdAt: string;
  updatedAt: string;
}