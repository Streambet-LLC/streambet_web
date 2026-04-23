/**
 * Prize system types matching backend DTOs
 */

export type PrizeBrand = 'pokemon' | 'one_piece' | 'sports' | 'other';

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
  updatedBy: string | null;
  isProOnly: boolean;
  proEarlyAccessUntil: string | null;
  viewCount?: number;
  watcherCount?: number;
  isWatching?: boolean;
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

export type ShippingCarrier = typeof SHIPPING_CARRIERS[number];

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
  paymentMethod: 'coins' | 'usd' | 'combined';
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
  paymentMethod: 'coins' | 'usd' | 'combined';
  coinsDeducted: number;
  usdCharged: number;
  totalPrice: number;
  stripePriceId?: string; // For USD payment via Stripe
  stripeSessionId?: string;
  status:
    | 'pending'
    | 'buy_attempted'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';
  createdAt: string;
  updatedAt: string;
}