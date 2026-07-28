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

/**
 * Outreach pipeline stages for a collector profile. Stored on
 * `analytics_profile.outreachStatus`; absent/empty means "Not contacted".
 */
export const OUTREACH_STATUS_OPTIONS = [
  'Not contacted',
  'Contacted',
  'Replied',
  'Won',
  'Passed',
] as const;

export type OutreachStatus = (typeof OUTREACH_STATUS_OPTIONS)[number];

/** Tailwind classes for the outreach-status chip, keyed by status. */
export const OUTREACH_STATUS_STYLES: Record<OutreachStatus, string> = {
  'Not contacted': 'border-white/10 bg-white/5 text-white/50',
  Contacted: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  Replied: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Won: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Passed: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

/** Statuses that count as "we've reached out" (used to stamp lastContactedAt). */
export const OUTREACH_REACHED_STATUSES: OutreachStatus[] = [
  'Contacted',
  'Replied',
  'Won',
];

/** Normalize a stored status to a canonical option; defaults to "Not contacted". */
export const normalizeOutreachStatus = (raw?: string | null): OutreachStatus => {
  const v = (raw ?? '').trim();
  return (
    OUTREACH_STATUS_OPTIONS.find(o => o.toLowerCase() === v.toLowerCase()) ??
    'Not contacted'
  );
};

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
  /** Outreach pipeline stage ("Contacted", "Replied", …). */
  outreachStatus?: string;
  /** ISO timestamp of the last time an admin marked the collector contacted. */
  lastContactedAt?: string;
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

export type DiscoverySource =
  | 'reddit'
  | 'bluesky'
  | 'youtube'
  | 'google'
  | 'twitch';

/** A source-agnostic discovery lead (Reddit post, Bluesky post, …). */
export interface ApiDiscoveryLead {
  id: string;
  platform: DiscoverySource;
  author: string;
  authorDisplay: string | null;
  /** Community context (subreddit) when applicable. */
  community: string | null;
  title: string | null;
  text: string;
  url: string;
  upvotes: number | null;
  comments: number | null;
  reposts: number | null;
  /** Unix seconds. */
  createdAt: number;
}

export interface ApiDiscoveryResult {
  /** False only when the chosen source needs credentials it doesn't have. */
  configured: boolean;
  source: DiscoverySource;
  leads: ApiDiscoveryLead[];
  /** Set when the upstream API failed (e.g. bad key) — leads will be empty. */
  error?: string;
}

/** A persisted lead in the pool (a discovery result saved to `discovered_leads`). */
export interface ApiDiscoveredLead {
  id: string;
  source: DiscoverySource;
  externalId: string;
  author: string;
  authorDisplay: string | null;
  community: string | null;
  title: string | null;
  text: string;
  url: string | null;
  upvotes: number | null;
  comments: number | null;
  reposts: number | null;
  postedAt: string | null;
  query: string | null;
  status: 'new' | 'added' | 'dismissed' | string;
  convertedUserId: string | null;
  createdAt: string;
  /** Claude qualification (null until qualified). */
  buyerScore: number | null;
  intent:
    | 'buying'
    | 'selling'
    | 'showcase'
    | 'discussion'
    | 'off_topic'
    | string
    | null;
  interests: string[] | null;
  qualifyReasoning: string | null;
  qualifiedAt: string | null;
}

export interface ApiDiscoveredLeadsList {
  total: number;
  data: ApiDiscoveredLead[];
  /** Count of leads still needing qualification. */
  unqualified: number;
}

export interface ApiQuerySuggestions {
  terms: string[];
  subreddits: string[];
  rationale: string;
}

export interface ApiLeadStats {
  total: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Market / Dealer suite — per-card intelligence
// ---------------------------------------------------------------------------

export interface ApiMarketCard {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  grade: string | null;
  price: number | null;
  stock: number;
  isActive: boolean;
  sales: number;
  buyers: number;
  revenueUsd: number;
  lastSaleAt: string | null;
  concentrationPct: number | null;
  liquidity: 'High' | 'Medium' | 'Low' | null;
  liquidityScore: number;
  comps: {
    count: number;
    low: number | null;
    median: number | null;
    high: number | null;
    min: number | null;
    max: number | null;
  } | null;
  priceGapPct: number | null;
  vsMarketPct: number | null;
  whaleRecent: boolean;
}

export interface ApiMarketCardsList {
  total: number;
  data: ApiMarketCard[];
}

export interface ApiCardMarketSourceMeta {
  key: string;
  label: string;
  configured: boolean;
  note?: string;
}

export interface ApiCardMarketPoint {
  source: string;
  capturedAt: string;
  medianUsd: number | null;
  lowUsd: number | null;
  highUsd: number | null;
  avgUsd: number | null;
  sampleCount: number | null;
}

export interface ApiCardMarketLatest extends ApiCardMarketPoint {
  meta: Record<string, unknown> | null;
}

export interface ApiCardMarketProfile {
  cardId: string;
  name: string;
  brand: string | null;
  category: string | null;
  grade: string | null;
  sources: ApiCardMarketSourceMeta[];
  latest: ApiCardMarketLatest[];
  history: ApiCardMarketPoint[];
  consensusMedianUsd: number | null;
  updatedAt: string | null;
}

export interface ApiDeepResearchJob {
  id: string;
  subject: string;
  status: 'pending' | 'running' | 'done' | 'error' | string;
  result: ApiCardForecast | null;
  error: string | null;
  /** Reference image of the confirmed card, shown atop the report. */
  imageUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ApiDeepResearchList {
  total: number;
  data: ApiDeepResearchJob[];
}

export interface ApiInsightsConversation {
  conversationId: string;
  title: string;
  count: number;
  startedAt: string;
  lastAt: string;
}

export interface ApiInsightsConversationList {
  total: number;
  data: ApiInsightsConversation[];
}

export interface ApiInsightsExchange {
  id: string;
  question: string;
  answer: string;
  tools: string[] | null;
  createdAt: string;
}

/**
 * In-flight state of one chat turn. Transient — once `status` is 'done' the
 * answer also lives in the conversation's exchanges, which stay permanently.
 */
export interface ApiInsightsRun {
  conversationId: string;
  question: string;
  status: 'running' | 'done' | 'error';
  /** Partial text while running, final text once done. */
  answer: string;
  tools: string[] | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ApiMarketMover {
  card: string;
  direction: string;
  changePct: number | null;
  note: string | null;
  url: string | null;
}
export interface ApiMarketCatalyst {
  title: string;
  timeframe: string | null;
  type: string | null;
  impact: string | null;
  note: string | null;
}
export interface ApiMarketSale {
  card: string;
  priceUsd: number | null;
  grade: string | null;
  venue: string | null;
  soldAt: string | null;
  url: string | null;
}

export interface ApiMarketSnapshot {
  id: string;
  segment: string;
  capturedAt: string;
  metrics: Record<string, number>;
  summary: string | null;
  highlights: string[] | null;
  sources: { title: string; url: string }[] | null;
  movers: ApiMarketMover[] | null;
  catalysts: ApiMarketCatalyst[] | null;
  sales: ApiMarketSale[] | null;
}

export interface ApiMarketCatalog {
  segments: { key: string; label: string }[];
  metrics: { key: string; label: string; help: string }[];
}

export type DashboardWidgetType =
  | 'stat'
  | 'line'
  | 'bar'
  | 'movers'
  | 'catalysts'
  | 'sales'
  | 'temperature'
  | 'leaderboard'
  | 'indices'
  | 'brief';

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  metric: string;
  segments: string[];
}

export interface DashboardLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardConfig {
  segments: string[];
  widgets: DashboardWidget[];
  layouts: Record<string, DashboardLayoutItem[]>;
  /** Trend-chart lookback in days; 0 = all history. */
  rangeDays?: number;
  /** Default-layout version — older saved configs are auto-upgraded. */
  version?: number;
}

/** A card being tracked for market research (the post-marketplace card source). */
export interface ApiTrackedCard {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  grade: string | null;
  notes: string | null;
  /** True = a real holding; false = watchlist only. */
  owned: boolean;
  /** Portfolio holding fields. */
  quantity: number;
  costBasisUsd: number | null;
  acquiredAt: string | null;
  lastValueUsd: number | null;
  lastConfidencePct: number | null;
  lastValuedAt: string | null;
  lastValuation: ApiCardValuation | null;
  alertAboveUsd: number | null;
  alertBelowUsd: number | null;
  ownerUserId: string | null;
  createdAt: string;
}

/** A triggered price alert for a holding. */
export interface ApiPortfolioAlert {
  id: string;
  name: string;
  type: 'target-above' | 'target-below' | 'move';
  direction: 'up' | 'down';
  message: string;
  valueUsd: number;
  changePct: number | null;
}

/** Portfolio roll-up across all holdings. */
export interface ApiPortfolioSummary {
  cards: ApiTrackedCard[];
  totalValueUsd: number;
  totalCostUsd: number;
  gainUsd: number;
  gainPct: number | null;
  costedCount: number;
  valuedCount: number;
  cardCount: number;
  movers: { id: string; name: string; changePct: number; valueUsd: number }[];
}

/** A logged sale — the realized side of the portfolio. P/L is derived server-side. */
export interface ApiSoldCard {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  grade: string | null;
  quantity: number;
  /** Per-unit cost basis (what you paid), USD. */
  costBasisUsd: number | null;
  /** Per-unit gross sale price, USD. */
  salePriceUsd: number | null;
  /** Total fees on the sale (not per-unit), USD. */
  feesUsd: number | null;
  platform: string | null;
  soldAt: string | null;
  notes: string | null;
  trackedCardId: string | null;
  ownerUserId: string | null;
  createdAt: string;
  /** Derived: salePrice x qty, before fees. */
  grossProceedsUsd: number | null;
  /** Derived: gross minus fees. */
  netProceedsUsd: number | null;
  /** Derived: costBasis x qty. */
  totalCostUsd: number | null;
  /** Derived: net proceeds minus cost. Null when either leg is unknown. */
  realizedGainUsd: number | null;
  realizedGainPct: number | null;
}

/** Realized roll-up across every logged sale. */
export interface ApiSoldSummary {
  sales: ApiSoldCard[];
  total: number;
  totalProceedsUsd: number;
  totalFeesUsd: number;
  netProceedsUsd: number;
  totalCostUsd: number;
  realizedGainUsd: number;
  realizedGainPct: number | null;
  saleCount: number;
  cardsSold: number;
  /** Sales missing a cost basis, so excluded from gain/loss. */
  uncostedCount: number;
  bestFlip: { id: string; name: string; realizedGainUsd: number } | null;
  worstFlip: { id: string; name: string; realizedGainUsd: number } | null;
}

/** A base64 image attached to a user turn (for the vision-capable chat). */
export interface ApiCardImage {
  /** Raw base64, no `data:` prefix. */
  data: string;
  /** MIME type, e.g. 'image/jpeg'. */
  mediaType: string;
}

export interface ApiInsightsMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Optional card photos for this turn. */
  images?: ApiCardImage[];
}

/**
 * A card the system thinks the user means, with a reference image so the admin
 * can visually confirm it's the right card before we analyze it.
 */
export interface ApiCardCandidate {
  isCard: boolean;
  subject: string;
  name: string;
  imageUrl: string | null;
  brand: string | null;
  set: string | null;
  number: string | null;
  grade: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/** One comp behind a valuation (price linked to its retrieved source). */
export interface ApiValComp {
  priceUsd: number;
  date: string | null;
  grade: string | null;
  sourceType: string;
  url: string | null;
}

/** A code-computed card valuation, rendered as a card in chat. */
export interface ApiCardValuation {
  isCard: boolean;
  subject: string;
  method: 'anchor-and-adjust' | 'recent-median' | 'triangulation' | string;
  pointUsd: number | null;
  lowUsd: number | null;
  highUsd: number | null;
  confidencePct: number;
  confidenceBasis: string;
  anchorComp: ApiValComp | null;
  compsUsed: ApiValComp[];
  indexAdjustment: { index: string; movePct: number; window: string } | null;
  /** Live eBay active-listing context (asks, not sold comps). */
  marketContext: {
    source: string;
    activeCount: number;
    lowestAskUsd: number | null;
    url: string;
  } | null;
  reliability: 'grounded' | 'thin' | 'unverified' | string;
  liquidity: string | null;
  trajectory: string | null;
  take: string | null;
  note: string | null;
  sources: { title: string; type?: string; url: string }[];
}

export interface ApiInsightsChatResult {
  reply: string;
  toolCalls: { name: string; input: unknown }[];
  valuation?: ApiCardValuation | null;
}

export interface ApiCardForecast {
  outlook: 'Bullish' | 'Neutral' | 'Bearish' | string;
  confidence: number;
  horizon: string;
  thesis: string;
  valueEstimate?: {
    pointUsd: number;
    lowUsd: number;
    highUsd: number;
    asOf: string;
  };
  method?: 'anchor-and-adjust' | 'recent-median' | 'triangulation' | string;
  anchorComp?: {
    priceUsd: number;
    date: string;
    sourceType: string;
    url: string;
  };
  compsUsed?: {
    priceUsd: number;
    date: string;
    grade: string;
    sourceType: string;
    url: string;
  }[];
  indexAdjustment?: {
    index: string;
    movePct: number;
    window: string;
  } | null;
  valuationConfidence?: { pct: number; basis: string };
  rating?: { score: number; label: string; rationale: string };
  liquidity?: { score: number; level: string; note: string };
  priceTrajectory?: { direction: string; note: string };
  likelyBuyers?: { profile: string; archetypes: string[] };
  socialBuzz: { level: string; summary: string };
  catalysts: {
    event: string;
    probabilityPct: number;
    direction: 'up' | 'down' | string;
    magnitude: 'small' | 'moderate' | 'large' | string;
    note: string;
  }[];
  precedents: { comparable: string; outcome: string }[];
  macroFactors: { factor: string; note: string }[];
  risks: { risk: string; note: string }[];
  suggestedAction: string;
  sources: { title: string; url: string }[];
}

export interface ApiCardForecastResult {
  forecast: ApiCardForecast;
  generatedAt: string;
}

export interface ApiMarketCardDetail extends ApiMarketCard {
  topBuyers: {
    userId: string;
    name: string | null;
    username: string;
    units: number;
    sharePct: number;
  }[];
  recentComps: {
    title: string;
    price: number | null;
    soldAt: string | null;
    url: string | null;
  }[];
  timeToSaleDays: number | null;
  recommendation: { verdict: string; reasoning: string } | null;
}

/**
 * A normalized external signal about a collector (a consented social handle,
 * an eBay official-API datapoint, or licensed-vendor data). Mirrors the
 * `external_signals` table. Compliant sources only.
 */
export interface ApiExternalSignal {
  id: string;
  userId: string | null;
  platform: string;
  handle: string;
  url: string | null;
  /** Provenance: 'consented' | 'ebay_api' | 'vendor'. */
  source: string;
  /** 'handle' | 'profile' | 'activity'. */
  signalType: string;
  label: string | null;
  data: Record<string, unknown> | null;
  /** Reconciliation confidence 0–100 when inferred; null for consented links. */
  confidence: number | null;
  collectedAt: string | null;
}

// ---------------------------------------------------------------------------
// Seller document ingest (CSV / Excel / Google Sheets)
// ---------------------------------------------------------------------------

export type SellerInventorySource = 'csv' | 'excel' | 'google_sheets';

/** A normalized inventory row sent to the ingest endpoint after mapping. */
export interface ApiInventoryItemInput {
  productName: string;
  sku?: string;
  setName?: string;
  condition?: string;
  grade?: string;
  quantity?: number;
  priceUsd?: number;
  raw?: Record<string, unknown>;
}

export interface ApiIngestSellerInventoryPayload {
  sellerUserId?: string;
  sellerLabel?: string;
  source: SellerInventorySource;
  fileName?: string;
  items: ApiInventoryItemInput[];
}

/** A CardCade buyer matched to one or more inventory items. */
export interface ApiSellerMatchedBuyer {
  userId: string;
  username: string;
  name: string | null;
  email: string;
  lifetimeSpendUsd: number;
  volume: 'High' | 'Medium' | 'Low' | null;
  location: string | null;
  unitsBought: number;
  matchedProductIds: string[];
  /** Present on the de-duplicated roster: how many inventory items they match. */
  matchedItems?: number;
}

export interface ApiSellerInventoryItemResult {
  id: string;
  rowIndex: number;
  productName: string;
  sku: string | null;
  setName: string | null;
  condition: string | null;
  grade: string | null;
  quantity: number | null;
  priceUsd: number | null;
  matchedBuyerCount: number;
  buyers: ApiSellerMatchedBuyer[];
}

export interface ApiSellerInventoryUploadSummary {
  id: string;
  sellerUserId: string | null;
  sellerLabel: string | null;
  source: SellerInventorySource;
  fileName: string | null;
  rowCount: number;
  matchedItemCount: number;
  matchedBuyerCount: number;
  createdAt: string;
}

export interface ApiSellerInventoryDetail
  extends ApiSellerInventoryUploadSummary {
  items: ApiSellerInventoryItemResult[];
  buyers: ApiSellerMatchedBuyer[];
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
