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
  status: string;
  counterpartyUsername: string | null;
}

export interface ApiCollectorProfileDetail extends ApiCollectorProfileSummary {
  categoryBreakdown: ApiCollectorCategorySpend[];
  recentOrders: ApiCollectorOrderEvent[];
}

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
