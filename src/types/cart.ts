import { PrizeConfiguration, ShippingAddress } from './prize';

/**
 * Cart system types matching backend DTOs
 */

export interface CartItem {
  id: string;
  cartId: string;
  prizeConfigurationId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  prizeConfiguration: PrizeConfiguration;
}

export interface Cart {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
}

export interface SellerGroup {
  sellerId: string | null;
  sellerName: string;
  shopName: string;
  stripeAccountId: string | null;
  items: CartItem[];
  itemSubtotalCents: number;
  shippingCents: number;
  buyerFeeCents: number;
  sellerFeeCents: number;
  sellerFeePercent: number;
  totalCents: number;
}

export interface CartTotals {
  itemSubtotalCents: number;
  shippingCents: number;
  buyerFeeCents: number;
  totalCents: number;
  itemCount: number;
}

export interface RemovedItem {
  id: string;
  name: string;
  reason: string;
}

export interface CartSummary {
  cart: Cart;
  sellerGroups: SellerGroup[];
  cartTotals: CartTotals;
  removedItems: RemovedItem[];
}

export interface CartCountResponse {
  count: number;
}

export interface AddToCartRequest {
  prizeConfigurationId: string;
  quantity?: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartCheckoutRequest {
  shippingAddress: ShippingAddress;
  cardcadePaymentMethod?: 'coins' | 'usd' | 'combined';
  coinsToApply?: number;
  discountCode?: string;
}

export interface CartCheckoutResponse {
  stripeSessionUrl?: string;
  coinOnlyOrderIds?: string[];
  message: string;
}

export interface ValidateDiscountCodeRequest {
  code: string;
}

export interface ValidateDiscountCodeResponse {
  valid: boolean;
  discountCodeId?: string;
  code?: string;
  discountType?: 'percent' | 'fixed_amount';
  discountPercent?: number;
  discountAmountCents?: number;
  scope?: 'cart' | 'cheapest_item';
  message: string;
}

export interface BundleOfferRequest {
  cartItemIds: string[];
  offerAmount: number;
  offerNotes?: string;
  shippingAddress: ShippingAddress;
}

export interface BundleOfferResponse {
  bundleId: string;
  orderIds: string[];
  message: string;
}

export interface ShippingAddressForm {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
