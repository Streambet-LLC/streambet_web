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

/**
 * Canonical collector personas. Mirrors `COLLECTOR_PERSONAS` on the API.
 * The admin "Persona override" field is a single-select over these.
 */
export const COLLECTOR_PERSONA_OPTIONS = [
  'Institution',
  'Pro Dealer',
  'Amateur Dealer',
  'Short Holder / Flipper',
  'Long Holder / Collector',
  'Hybrid - Long / Short',
  'Creator / Influencer',
  'Card Fund Manager',
] as const;

export type CollectorPersona = (typeof COLLECTOR_PERSONA_OPTIONS)[number];

/** Sports the admin can assign as the "Preferred Sport" override. */
export const SPORT_OPTIONS = [
  'Football',
  'Basketball',
  'Baseball',
  'Hockey',
  'Soccer',
] as const;

/** TCG games the admin can tag a collector with (multi-select). */
export const TCG_OPTIONS = [
  'Pokémon',
  'One Piece',
  'Magic',
  'Yu-Gi-Oh',
  'Lorcana',
  'Disney',
  'Other',
] as const;

/** Collector interests the admin can tag (multi-select). */
export const INTEREST_OPTIONS = [
  'Vintage',
  'Modern',
  'Graded',
  'Raw',
  'Sealed',
  'Singles',
  'Rookies',
  'Autographs',
  'Patches',
  'Numbered',
  '1st Edition',
  'Promos',
  'Japanese',
  'Grails',
] as const;

/**
 * Map a stored persona value to a canonical option (case-insensitive), so
 * legacy free-text values like "pro dealer" resolve to "Pro Dealer". Returns
 * '' for empty/unrecognized values.
 */
export const normalizeCollectorPersona = (raw?: string | null): string => {
  const v = (raw ?? '').trim();
  if (!v) return '';
  return (
    COLLECTOR_PERSONA_OPTIONS.find(o => o.toLowerCase() === v.toLowerCase()) ??
    ''
  );
};

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
  /**
   * Heuristic forecast of next-30-day USD spend (run-rate × recency decay),
   * buy-side only so sellers who buy sealed get a value. 0 with no history.
   */
  predicted30dSpendUsd: number;
  purchaseCount: number;
  saleCount: number;
  lifetimeSalesUsd: number;
  lastPurchaseAt: string | null;
  topCategories: ApiAnalyticsCategory[];
  /** Admin-set persona label (analytics_profile.personaOverride); null if unset. */
  persona: string | null;
  /** Admin-set affiliation/group (analytics_profile.affiliation); null if none. */
  affiliation: string | null;
  /** True when an admin has omitted this user from the Analytics surface. */
  excluded: boolean;
  /** True when an admin manually added this profile (vs an organic signup/buyer). */
  manuallyAdded: boolean;
  /** Centralized metro area derived from city/state/zip; null when unknown. */
  location: string | null;
  /** Rough buyer-volume guesstimate from lifetime spend; null for non-buyers. */
  volume: 'High' | 'Medium' | 'Low' | null;
  /** Preferred sports for Sports collectors (admin tags or all derived); empty otherwise. */
  preferredSports: string[];
  /** Preferred teams for Sports collectors (admin tags or all derived); empty otherwise. */
  preferredTeams: string[];
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
  /** Affiliation / group label (shop, league, org). Optional. */
  affiliation?: string;
  /** When true, the user is omitted from the Analytics surface. */
  excludedFromAnalytics?: boolean;
  /** Admin override for the Sports sub-category (wins over auto-derived). */
  preferredSports?: string[];
  preferredTeams?: string[];
  /** TCG games the collector focuses on (Pokémon, One Piece, …). */
  tcgGames?: string[];
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

/** Payload for POST /admin/analytics/collectors (create a new profile). */
export interface ApiCreateCollectorProfilePayload {
  /** Optional unique username. Auto-generated server-side when omitted. */
  username?: string;
  /** Optional unique email. A placeholder is generated when omitted. */
  email?: string;
  displayName?: string;
  bio?: string;
  personaOverride?: string;
  affiliation?: string;
  preferredSports?: string[];
  preferredTeams?: string[];
  tcgGames?: string[];
  interests?: string[];
  preferences?: string[];
  customAttributes?: Record<string, string>;
  notes?: string;
  /** Optional analytics socials to seed (multiple per platform allowed). */
  socials?: Array<{
    platform: ApiAnalyticsSocialPlatform;
    value: string;
    label?: string;
  }>;
  /** When true, also write seeded socials onto the public profile map. */
  applyToPublic?: boolean;
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
  /** Summed per-buyer heuristic forecast of next-30-day spend (companion to spend30dUsd). */
  predicted30dSpendUsd: number;
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
  /** Server-side sort key. Defaults to lifetime spend. */
  sort?:
    | 'lifetime'
    | 'last30d'
    | 'recent'
    | 'predicted'
    | 'name'
    | 'persona'
    | 'affiliation'
    | 'location'
    | 'volume';
  /** Sort direction. */
  dir?: 'asc' | 'desc';
  /** Server-side category filter (by purchased prize brand). */
  category?: 'all' | 'pokemon' | 'one_piece' | 'sports' | 'other';
  /** When true, include admin-omitted users (hidden by default). */
  includeOmitted?: boolean;
}
