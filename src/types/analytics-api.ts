/**
 * Shapes returned by the new admin collector analytics endpoints
 * (`/admin/analytics/collectors/*`). These mirror the NestJS DTOs in
 * `streambet_api/src/admin/dto/collector-analytics.dto.ts`.
 *
 * Kept in a separate file so both the API client and the merge helpers in
 * `lib/analytics-merge.ts` can import them without dragging in mock data.
 */

export type ApiAnalyticsCategory =
  | 'pokemon'
  | 'one_piece'
  | 'sports'
  | 'other';

export type ApiAnalyticsSocialPlatform =
  | 'instagram'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'twitch'
  | 'ebay';

export interface ApiCollectorSocial {
  platform: ApiAnalyticsSocialPlatform;
  handle: string;
  url: string;
  /** Stable id for analytics-only entries (allows multiple per platform). */
  id?: string;
  /** Optional admin-supplied label ("Personal", "Shop", "Pokémon-only"). */
  label?: string;
  /**
   * `public` rows come from `users.socials` (one-per-platform, visible on
   * the user's profile/shop). `analytics` rows live on
   * `analytics_profile.socials`, allow multiple per platform, and never
   * leak to the public profile unless explicitly mirrored.
   */
  source: 'public' | 'analytics';
}

export interface ApiCollectorCategorySpend {
  category: ApiAnalyticsCategory;
  spendUsd: number;
  orderCount: number;
}

export interface ApiCollectorProfileSummary {
  id: string;
  username: string;
  displayName: string;
  email: string;
  joinedAt: string;
  isSeller: boolean;
  lifetimeSpendUsd: number;
  last30dSpendUsd: number;
  purchaseCount: number;
  saleCount: number;
  lifetimeSalesUsd: number;
  lastPurchaseAt: string | null;
  topCategories: ApiAnalyticsCategory[];
  socials: ApiCollectorSocial[];
}

export interface ApiCollectorOrderEvent {
  id: string;
  kind: 'purchase' | 'sale';
  at: string;
  prizeName: string;
  category: ApiAnalyticsCategory;
  amountUsd: number;
  paymentMethod: 'coins' | 'usd' | 'combined' | 'crypto';
  /**
   * Stripe Checkout method actually used (card vs us_bank_account / ACH).
   * Only meaningful for usd/combined orders; null otherwise.
   */
  stripePaymentMethod: 'card' | 'us_bank_account' | null;
  status: string;
  counterpartyUsername: string | null;
}

export interface ApiCollectorProfileDetail extends ApiCollectorProfileSummary {
  categoryBreakdown: ApiCollectorCategorySpend[];
  recentOrders: ApiCollectorOrderEvent[];
  /**
   * Admin-injected analytics annotations. Free-form on the wire so we can
   * iterate without lockstep API changes; consumers should treat unknown
   * keys as optional.
   */
  analyticsProfile?: ApiCollectorAnalyticsAnnotations | null;
}

/**
 * Loose shape for the admin-managed annotations stored on
 * `users.analytics_profile`. Mirrors `AnalyticsProfileAnnotations` on the
 * API. Used by the future AI integration.
 */
export interface ApiCollectorAnalyticsAnnotations {
  displayName?: string;
  bio?: string;
  personaOverride?: string;
  interests?: string[];
  preferences?: string[];
  customAttributes?: Record<string, string>;
  notes?: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

/** Payload for PATCH /admin/analytics/collectors/:id/socials. */
export interface ApiUpdateCollectorSocialsPayload {
  entries: Array<{
    /** Existing id when editing a row. Omit when adding a new one. */
    id?: string;
    platform: ApiAnalyticsSocialPlatform;
    /** Empty string drops the row. */
    value: string;
    /** Optional admin label. */
    label?: string;
  }>;
  /**
   * When true, also overwrite the canonical `users.socials` map (one per
   * platform, first wins) so the changes surface on the user's public
   * profile and shop. Defaults to false (analytics-only).
   */
  applyToPublic?: boolean;
}

/** Payload for PATCH /admin/analytics/collectors/:id/profile. */
export type ApiUpdateCollectorAnalyticsProfilePayload = ApiCollectorAnalyticsAnnotations;

export interface ApiCollectorOverviewCategory {
  category: ApiAnalyticsCategory;
  label: string;
  spendUsd: number;
  userCount: number;
}

export interface ApiCollectorOverviewTopAsset {
  assetId: string;
  name: string;
  category: ApiAnalyticsCategory;
  buyers: number;
  unitsSold: number;
  revenueUsd: number;
}

export interface ApiCollectorOverviewSpendWeek {
  weekStart: string;
  label: string;
  spendUsd: number;
  buyers: number;
}

export interface ApiCollectorAnalyticsOverview {
  totalProfiles: number;
  activeBuyers30d: number;
  activeSellers30d: number;
  spend30dUsd: number;
  lifetimeSpendUsd: number;
  categoryAffinity: ApiCollectorOverviewCategory[];
  topAssets: ApiCollectorOverviewTopAsset[];
  spendTrend: ApiCollectorOverviewSpendWeek[];
}

export interface ApiCollectorProfilesList {
  total: number;
  data: ApiCollectorProfileSummary[];
}

export interface ApiCollectorListParams {
  limit?: number;
  offset?: number;
  search?: string;
  onlySellers?: boolean;
}
