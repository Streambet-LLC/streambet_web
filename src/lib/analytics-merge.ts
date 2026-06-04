/**
 * Bridges the new admin "collector analytics" API responses (real buy/sell +
 * seller socials) onto the existing Analytics UI shapes from
 * `@/mocks/analytics`. Wherever we have real data we use it; wherever we
 * don't (predictions, persona inference, scraped accounts, etc.) we keep
 * deterministic mock values so the UI continues to render.
 */

import {
  MOCK_ANALYTICS_OVERVIEW,
  MOCK_ANALYTICS_USERS,
  getMockAnalyticsUser,
  type AnalyticsOverview,
  type AnalyticsUser,
  type ActivityEvent,
  type LinkedAccount,
  type Persona,
  type SocialPlatform,
  type AssetCategory,
  type CategoryAffinity,
  type TopAssetForecast,
} from '@/mocks/analytics';
import type {
  ApiAnalyticsCategory,
  ApiAnalyticsSocialPlatform,
  ApiCollectorAnalyticsOverview,
  ApiCollectorOrderEvent,
  ApiCollectorOverviewCategory,
  ApiCollectorProfileDetail,
  ApiCollectorProfileSummary,
  ApiCollectorSocial,
} from '@/types/analytics-api';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const CATEGORY_LABEL: Record<ApiAnalyticsCategory, string> = {
  pokemon: 'Pokémon',
  one_piece: 'One Piece',
  sports: 'Sports',
  other: 'Other',
};

const apiCategoryToUi = (c: ApiAnalyticsCategory): AssetCategory => c;

// ---------------------------------------------------------------------------
// Socials → LinkedAccount
// ---------------------------------------------------------------------------

/**
 * The Analytics UI today only renders these platforms via PlatformIcon.
 * Anything outside this set (youtube, twitch) is dropped to avoid runtime
 * gaps. We can extend the icon map later.
 */
const UI_PLATFORM_SET: ReadonlySet<SocialPlatform> = new Set<SocialPlatform>([
  'ebay',
  'instagram',
  'twitter',
  'tiktok',
  'facebook',
  'reddit',
  'discord',
]);

const apiPlatformToUi = (
  p: ApiAnalyticsSocialPlatform,
): SocialPlatform | null => {
  if ((UI_PLATFORM_SET as ReadonlySet<string>).has(p)) {
    return p as SocialPlatform;
  }
  return null;
};

const socialToLinkedAccount = (s: ApiCollectorSocial): LinkedAccount | null => {
  const platform = apiPlatformToUi(s.platform);
  if (!platform) return null;
  return {
    platform,
    handle: s.handle,
    url: s.url,
    // Sellers self-report these in onboarding — treat as verified.
    confidence: 100,
    signals: ['Provided by seller during onboarding'],
    verified: true,
    manuallyLinked: true,
  };
};

// ---------------------------------------------------------------------------
// Persona heuristic (placeholder until real model is wired)
// ---------------------------------------------------------------------------

/**
 * Cheap deterministic persona pick driven by real spend signals so each user
 * still gets a stable, plausible-looking label. Replace with a real model
 * later.
 */
const inferPersona = (p: ApiCollectorProfileSummary): Persona => {
  if (p.saleCount >= 5) return 'Loyal Fan';
  if (p.lifetimeSpendUsd >= 10_000) return 'Whale Collector';
  if (p.lifetimeSpendUsd >= 2_500) return 'Set Builder';
  if (p.purchaseCount >= 10) return 'Casual Flipper';
  if (p.purchaseCount >= 3) return 'Bargain Hunter';
  if (p.purchaseCount === 0) return 'New Account';
  return 'Speculator';
};

// ---------------------------------------------------------------------------
// Order events → ActivityEvent
// ---------------------------------------------------------------------------

const orderToActivity = (o: ApiCollectorOrderEvent): ActivityEvent => {
  // Tag in-flight ACH (us_bank_account) debits in the summary line so
  // the collector activity feed clearly shows these are not yet settled.
  // Matches the "ACH Settling" pill used in Sales History / My Purchases.
  const pendingTag =
    o.status === 'payment_processing'
      ? o.stripePaymentMethod === 'us_bank_account'
        ? ' — ACH Settling'
        : ' — Processing'
      : '';

  return {
    id: o.id,
    at: o.at,
    kind: o.kind,
    source: 'cardcade',
    summary:
      o.kind === 'purchase'
        ? `Bought ${o.prizeName}${o.counterpartyUsername ? ` from @${o.counterpartyUsername}` : ''}${pendingTag}`
        : `Sold ${o.prizeName}${o.counterpartyUsername ? ` to @${o.counterpartyUsername}` : ''}${pendingTag}`,
    amountUsd: o.amountUsd,
  };
};

// ---------------------------------------------------------------------------
// Profile (summary or detail) → AnalyticsUser
// ---------------------------------------------------------------------------

/** Mock fallback for a profile so unwired UI fields still render. */
const fallbackUser = (id: string): AnalyticsUser =>
  getMockAnalyticsUser(id) ?? MOCK_ANALYTICS_USERS[0];

/**
 * Build a fully-populated `AnalyticsUser` by overlaying real CardCade data
 * onto a mock skeleton. Pass a `detail` payload when available to also
 * populate `recentActivity` from real orders.
 *
 * When `realOnly` is true, ALL mock-derived fields are zeroed/emptied so
 * the UI shows only data we actually own (spend, categories, socials,
 * orders).
 */
export const mergeProfileIntoAnalyticsUser = (
  profile: ApiCollectorProfileSummary,
  detail?: ApiCollectorProfileDetail,
  realOnly = false,
): AnalyticsUser => {
  const linkedFromSocials = profile.socials
    .map(socialToLinkedAccount)
    .filter((x): x is LinkedAccount => x !== null);

  const realActivity: ActivityEvent[] = detail?.recentOrders.map(orderToActivity) ?? [];

  const topCategoriesReal: AssetCategory[] = profile.topCategories.map(apiCategoryToUi);

  // Admin-injected annotations (notes, persona override, bio, etc.). These
  // win over both API defaults AND mock fallbacks so admins can hand-curate
  // the analytics surface ahead of the AI integration.
  const annotations = detail?.analyticsProfile ?? null;

  const overlayFromAnnotations = (base: AnalyticsUser): AnalyticsUser => {
    if (!annotations) return base;
    return {
      ...base,
      displayName: annotations.displayName?.trim() || base.displayName,
      persona: (annotations.personaOverride?.trim() || base.persona) as AnalyticsUser['persona'],
      inferredBio: annotations.bio?.trim() || base.inferredBio,
    };
  };

  if (realOnly) {
    // Build a fully-real record. Anything we don't own becomes empty/0 so
    // the UI can hide / skip those sections.
    const base: AnalyticsUser = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      email: profile.email,
      joinedAt: profile.joinedAt,
      // Persona is still derived from real spend signals, not a mock label.
      persona: inferPersona(profile),
      unifiedConfidence: 0,
      lifetimeSpendUsd: profile.lifetimeSpendUsd,
      predicted30dSpendUsd: profile.predicted30dSpendUsd,
      actual30dSpendUsd: profile.last30dSpendUsd,
      purchaseCount: profile.purchaseCount,
      topCategories: topCategoriesReal,
      engagementScore: 0,
      winRate: 0,
      linkedAccounts: linkedFromSocials,
      unmatchedPlatforms: [],
      predictions: [],
      recentActivity: realActivity,
      inferredBio: annotations?.bio?.trim() ?? '',
    };
    return overlayFromAnnotations(base);
  }

  const mock = fallbackUser(profile.id);

  // Keep any mock-only platforms that the seller did NOT supply, so the
  // demo UI still shows multi-source identity coverage.
  const ownedPlatforms = new Set(linkedFromSocials.map(a => a.platform));
  const mockExtras = mock.linkedAccounts.filter(a => !ownedPlatforms.has(a.platform));

  const topCategories: AssetCategory[] =
    topCategoriesReal.length > 0 ? topCategoriesReal : mock.topCategories;

  // Splice real orders to the top of the mock activity stream so admins
  // see real history first, then fall through to the demo events.
  const recentActivity: ActivityEvent[] = [
    ...realActivity,
    ...mock.recentActivity.filter(e => !realActivity.some(r => r.id === e.id)),
  ].slice(0, 25);

  const base: AnalyticsUser = {
    ...mock,
    id: profile.id,
    username: profile.username || mock.username,
    displayName: profile.displayName || mock.displayName,
    email: profile.email || mock.email,
    joinedAt: profile.joinedAt || mock.joinedAt,
    persona: inferPersona(profile),
    lifetimeSpendUsd: profile.lifetimeSpendUsd,
    predicted30dSpendUsd: profile.predicted30dSpendUsd,
    actual30dSpendUsd: profile.last30dSpendUsd,
    purchaseCount: profile.purchaseCount,
    topCategories,
    linkedAccounts: [...linkedFromSocials, ...mockExtras],
    recentActivity,
  };
  return overlayFromAnnotations(base);
};

// ---------------------------------------------------------------------------
// Overview merge
// ---------------------------------------------------------------------------

/** Friendly label like "W12" for chart axes, mirroring mock spendTrend. */
const weekLabel = (i: number, total: number) => `W${total - i}`;

export const mergeOverview = (
  api: ApiCollectorAnalyticsOverview,
  realOnly = false,
): AnalyticsOverview => {
  const categoryAffinity: CategoryAffinity[] = api.categoryAffinity.map(
    (c: ApiCollectorOverviewCategory) => ({
      category: apiCategoryToUi(c.category),
      label: c.label || CATEGORY_LABEL[c.category],
      predictedSpendUsd: c.spendUsd,
      userCount: c.userCount,
    }),
  );

  const topAssets: TopAssetForecast[] = api.topAssets.map(a => ({
    assetId: a.assetId,
    name: a.name,
    category: apiCategoryToUi(a.category),
    predictedBuyers: a.buyers,
    avgBuyLikelihood: Math.min(100, Math.round(a.unitsSold * 10)),
    totalPredictedSpendUsd: a.revenueUsd,
  }));

  const spendTrend = api.spendTrend.map((w, i, arr) => ({
    week: w.label || weekLabel(i, arr.length),
    predicted: Math.round(w.spendUsd / 1000),
    actual: Math.round(w.spendUsd / 1000),
  }));

  if (realOnly) {
    // Strip every mock-derived series so the dashboard only renders
    // numbers we can defend with real data.
    return {
      totalProfiles: api.totalProfiles,
      unifiedIdentitiesLinked: 0,
      avgIdentityConfidence: 0,
      predicted30dSpendUsd: api.predicted30dSpendUsd,
      actual30dSpendUsd: api.spend30dUsd,
      topPersonas: [],
      categoryAffinity,
      topAssets,
      confidenceDistribution: [],
      spendTrend,
    };
  }

  return {
    ...MOCK_ANALYTICS_OVERVIEW,
    totalProfiles: api.totalProfiles,
    predicted30dSpendUsd: api.predicted30dSpendUsd,
    actual30dSpendUsd: api.spend30dUsd,
    categoryAffinity: categoryAffinity.length
      ? categoryAffinity
      : MOCK_ANALYTICS_OVERVIEW.categoryAffinity,
    topAssets: topAssets.length
      ? topAssets
      : MOCK_ANALYTICS_OVERVIEW.topAssets,
    spendTrend: spendTrend.length
      ? spendTrend
      : MOCK_ANALYTICS_OVERVIEW.spendTrend,
  };
};
