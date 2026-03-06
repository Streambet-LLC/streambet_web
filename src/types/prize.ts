/**
 * Prize system types matching backend DTOs
 */

export type PrizeBrand = 'pokemon' | 'one_piece' | 'sports' | 'other';

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
  category: 'slab' | 'sealed';
  stock: number;
  purchaseOption: 'offers_only' | 'buy_only' | 'both';
  brand: PrizeBrand;
  displayOrderShop: number | null;
  displayOrderRedemptions: number | null;
  displayOrderNicksNiceties: number | null;
  featuredDisplayOrder: number | null;
  showOnRedemptions: boolean;
  showOnNicksNiceties: boolean;
  showOnShop: boolean;
  sortByPurchaseOptionShop: boolean;
  sortByPurchaseOptionRedemptions: boolean;
  sortByPurchaseOptionNicksNiceties: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * DTO for creating a new prize tier
 */
export interface CreatePrizeTierRequest {
  amount?: number;
  name: string;
  description?: string;
  imageUrl?: string;
  category: 'slab' | 'sealed';
  stock: number;
  purchaseOption: 'offers_only' | 'buy_only' | 'both';
  brand?: PrizeBrand;
  displayOrderShop?: number;
  displayOrderRedemptions?: number;
  displayOrderNicksNiceties?: number;
  featuredDisplayOrder?: number | null;
  showOnRedemptions?: boolean;
  showOnNicksNiceties?: boolean;
  showOnShop?: boolean;
}

/**
 * DTO for updating an existing prize tier
 */
export interface UpdatePrizeTierRequest {
  amount?: number;
  name: string;
  description?: string;
  imageUrl?: string;
  category: 'slab' | 'sealed';
  stock: number;
  purchaseOption: 'offers_only' | 'buy_only' | 'both';
  brand?: PrizeBrand;
  displayOrderShop?: number;
  displayOrderRedemptions?: number;
  displayOrderNicksNiceties?: number;
  featuredDisplayOrder?: number | null;
  showOnRedemptions?: boolean;
  showOnNicksNiceties?: boolean;
  showOnShop?: boolean;
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