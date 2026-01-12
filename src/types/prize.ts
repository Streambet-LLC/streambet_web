/**
 * Prize system types matching backend DTOs
 */

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
  prizeTier: number;
  amount: number;
  name: string;
  description?: string;
  imageUrl?: string;
}

/**
 * DTO for updating an existing prize tier
 */
export interface UpdatePrizeTierRequest {
  prizeTier: number;
  amount: number;
  name: string;
  description?: string;
  imageUrl?: string;
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
