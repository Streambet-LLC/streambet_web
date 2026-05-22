/**
 * Mock data for the Analytics feature (admin-only demo).
 *
 * Everything here is hard-coded and deterministic so the demo
 * looks consistent across reloads. Swap with API calls later.
 */

export type SocialPlatform =
  | 'ebay'
  | 'instagram'
  | 'twitter'
  | 'tiktok'
  | 'facebook'
  | 'reddit'
  | 'discord';

export type AssetCategory = 'pokemon' | 'one_piece' | 'sports' | 'other';

export type Persona =
  | 'Whale Collector'
  | 'Set Builder'
  | 'Vintage Hunter'
  | 'Speculator'
  | 'Casual Flipper'
  | 'Bargain Hunter'
  | 'Loyal Fan'
  | 'New Account';

export interface LinkedAccount {
  platform: SocialPlatform;
  handle: string;
  url: string;
  /** 0-100 confidence this account is the same person */
  confidence: number;
  followers?: number;
  /** Short list of signals that contributed to the match */
  signals: string[];
  verified?: boolean;
}

export interface AssetPrediction {
  assetId: string;
  name: string;
  category: AssetCategory;
  era: string;
  /** Reference market price in USD */
  marketPriceUsd: number;
  /** 0-100 likelihood to purchase in next 30 days */
  buyLikelihood: number;
  /** 0-100 likelihood to pay at-or-above current market */
  payMarketLikelihood: number;
  /** Predicted spend ceiling in USD */
  predictedCeilingUsd: number;
  /** 0-100 model confidence */
  confidence: number;
  /** Short rationale shown as tooltip / sub-line */
  rationale: string;
}

export interface ActivityEvent {
  id: string;
  /** ISO date */
  at: string;
  kind: 'purchase' | 'bid' | 'watchlist' | 'social_mention' | 'search' | 'sale';
  source: SocialPlatform | 'cardcade';
  summary: string;
  amountUsd?: number;
}

export interface AnalyticsUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  joinedAt: string;
  persona: Persona;
  /** Avg confidence across linked identities */
  unifiedConfidence: number;
  /** Lifetime spend on CardCade in USD */
  lifetimeSpendUsd: number;
  /** Predicted next-30-day spend (USD) */
  predicted30dSpendUsd: number;
  /** Total purchases on CardCade */
  purchaseCount: number;
  /** Primary collecting categories, ordered by affinity */
  topCategories: AssetCategory[];
  /** Engagement score 0-100 (logins, watchlist, bids) */
  engagementScore: number;
  /** % of bids that converted to a win in last 90d */
  winRate: number;
  linkedAccounts: LinkedAccount[];
  predictions: AssetPrediction[];
  recentActivity: ActivityEvent[];
  /** Free-form short bio from inferred profile */
  inferredBio: string;
}

// ---------------------------------------------------------------------------
// Asset catalog — modeled on the categories actually live on CardCade
// (Pokemon, One Piece, Sports, Other). These names appear across user
// predictions to keep the demo coherent.
// ---------------------------------------------------------------------------

export const MOCK_ASSETS: Omit<
  AssetPrediction,
  'buyLikelihood' | 'payMarketLikelihood' | 'predictedCeilingUsd' | 'confidence' | 'rationale'
>[] = [
  {
    assetId: 'pkm-charizard-base-holo',
    name: 'Charizard — Base Set Holo (PSA 9)',
    category: 'pokemon',
    era: 'Base Set · 1999',
    marketPriceUsd: 4200,
  },
  {
    assetId: 'pkm-pikachu-xy-promo',
    name: 'Pikachu — XY Black Star Promo',
    category: 'pokemon',
    era: 'XY Era · 2014',
    marketPriceUsd: 85,
  },
  {
    assetId: 'pkm-umbreon-vmax-alt',
    name: 'Umbreon VMAX Alt Art (Moonbreon)',
    category: 'pokemon',
    era: 'Evolving Skies · 2021',
    marketPriceUsd: 1850,
  },
  {
    assetId: 'pkm-lugia-neo-genesis',
    name: 'Lugia — Neo Genesis 1st Edition Holo',
    category: 'pokemon',
    era: 'Neo Genesis · 2000',
    marketPriceUsd: 2400,
  },
  {
    assetId: 'pkm-blastoise-shadowless',
    name: 'Blastoise — Shadowless Holo',
    category: 'pokemon',
    era: 'Base Set · 1999',
    marketPriceUsd: 1100,
  },
  {
    assetId: 'pkm-mew-ancient-mew',
    name: 'Ancient Mew — Movie Promo',
    category: 'pokemon',
    era: 'Promo · 2000',
    marketPriceUsd: 65,
  },
  {
    assetId: 'op-luffy-leader',
    name: 'Monkey D. Luffy — OP01-001 Leader',
    category: 'one_piece',
    era: 'Romance Dawn · 2022',
    marketPriceUsd: 95,
  },
  {
    assetId: 'op-zoro-manga-rare',
    name: 'Zoro — Manga Rare OP01-025',
    category: 'one_piece',
    era: 'Romance Dawn · 2022',
    marketPriceUsd: 320,
  },
  {
    assetId: 'op-shanks-leader',
    name: 'Shanks — Leader Parallel',
    category: 'one_piece',
    era: 'Paramount War · 2023',
    marketPriceUsd: 210,
  },
  {
    assetId: 'sp-brady-rookie',
    name: 'Tom Brady — 2000 Bowman Chrome Rookie',
    category: 'sports',
    era: 'NFL · 2000',
    marketPriceUsd: 3400,
  },
  {
    assetId: 'sp-lebron-topps',
    name: 'LeBron James — 2003 Topps Chrome Rookie',
    category: 'sports',
    era: 'NBA · 2003',
    marketPriceUsd: 2750,
  },
  {
    assetId: 'sp-jordan-fleer',
    name: 'Michael Jordan — 1986 Fleer Rookie',
    category: 'sports',
    era: 'NBA · 1986',
    marketPriceUsd: 5200,
  },
  {
    assetId: 'sp-ohtani-bowman',
    name: 'Shohei Ohtani — 2018 Bowman Chrome Refractor',
    category: 'sports',
    era: 'MLB · 2018',
    marketPriceUsd: 480,
  },
  {
    assetId: 'oth-bewd-1st',
    name: 'Blue-Eyes White Dragon — LOB 1st Edition',
    category: 'other',
    era: 'Yu-Gi-Oh · 2002',
    marketPriceUsd: 1600,
  },
  {
    assetId: 'oth-black-lotus',
    name: 'Black Lotus — MTG Unlimited',
    category: 'other',
    era: 'Magic · 1993',
    marketPriceUsd: 8500,
  },
];

const ASSET_BY_ID = Object.fromEntries(MOCK_ASSETS.map(a => [a.assetId, a]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pred = (
  assetId: string,
  buyLikelihood: number,
  payMarketLikelihood: number,
  confidence: number,
  rationale: string,
  ceilingMultiplier = 1.0
): AssetPrediction => {
  const a = ASSET_BY_ID[assetId];
  return {
    ...a,
    buyLikelihood,
    payMarketLikelihood,
    confidence,
    predictedCeilingUsd: Math.round(a.marketPriceUsd * ceilingMultiplier),
    rationale,
  };
};

const linked = (
  platform: SocialPlatform,
  handle: string,
  confidence: number,
  signals: string[],
  followers?: number,
  verified = false
): LinkedAccount => ({
  platform,
  handle,
  confidence,
  signals,
  followers,
  verified,
  url:
    platform === 'ebay'
      ? `https://www.ebay.com/usr/${handle}`
      : platform === 'instagram'
      ? `https://instagram.com/${handle}`
      : platform === 'twitter'
      ? `https://twitter.com/${handle}`
      : platform === 'tiktok'
      ? `https://tiktok.com/@${handle}`
      : platform === 'facebook'
      ? `https://facebook.com/${handle}`
      : platform === 'reddit'
      ? `https://reddit.com/user/${handle}`
      : `https://discord.com/users/${handle}`,
});

const ev = (
  id: string,
  daysAgo: number,
  kind: ActivityEvent['kind'],
  source: ActivityEvent['source'],
  summary: string,
  amountUsd?: number
): ActivityEvent => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id, at: d.toISOString(), kind, source, summary, amountUsd };
};

// ---------------------------------------------------------------------------
// Mock users
// ---------------------------------------------------------------------------

export const MOCK_ANALYTICS_USERS: AnalyticsUser[] = [
  {
    id: 'u-001',
    username: 'kanto_king',
    displayName: 'Marcus Reyes',
    email: 'marcus.reyes@example.com',
    joinedAt: '2024-02-11',
    persona: 'Whale Collector',
    unifiedConfidence: 94,
    lifetimeSpendUsd: 48_320,
    predicted30dSpendUsd: 6_400,
    purchaseCount: 142,
    topCategories: ['pokemon', 'other'],
    engagementScore: 92,
    winRate: 71,
    inferredBio:
      'High-end vintage Pokémon collector based in SoCal. Active on eBay since 2016, runs an IG account focused on PSA 10 Base Set grails.',
    linkedAccounts: [
      linked('ebay', 'kantograils', 97, ['Matching shipping ZIP', 'Same PayPal display name', '11 cross-purchases'], undefined, true),
      linked('instagram', 'kanto.grails', 95, ['Same profile photo (perceptual hash)', 'Bio links to eBay store'], 18_400, true),
      linked('twitter', 'kantograils', 88, ['Cross-posts of IG content', 'Same display name'], 4_200),
      linked('facebook', 'marcus.reyes.94', 72, ['Mutual marketplace group memberships', 'Name + city match']),
    ],
    predictions: [
      pred('pkm-charizard-base-holo', 88, 91, 96, 'Has bid on 4 Base Set holos in last 60 days, never below market.', 1.08),
      pred('pkm-blastoise-shadowless', 81, 84, 92, 'Completing a Shadowless run — Blastoise is one of 3 missing.', 1.05),
      pred('pkm-lugia-neo-genesis', 74, 79, 88, 'Recently posted Neo Genesis pulls on Instagram.', 1.02),
      pred('pkm-mew-ancient-mew', 22, 58, 81, 'Owns one already; unlikely repeat unless higher grade.'),
    ],
    recentActivity: [
      ev('a1', 2, 'purchase', 'cardcade', 'Won auction: Charizard Base Set Holo PSA 8', 3100),
      ev('a2', 4, 'bid', 'cardcade', 'Placed top bid on Blastoise Shadowless', 980),
      ev('a3', 6, 'social_mention', 'instagram', 'Posted reel: "Set hunt update — 2 cards left"'),
      ev('a4', 9, 'sale', 'ebay', 'Sold: Venusaur Base Set Holo PSA 7', 720),
      ev('a5', 14, 'watchlist', 'cardcade', 'Added Lugia Neo Genesis to watchlist'),
    ],
  },
  {
    id: 'u-002',
    username: 'breaknflip',
    displayName: 'Jordan Chen',
    email: 'jordan.c@example.com',
    joinedAt: '2024-08-22',
    persona: 'Casual Flipper',
    unifiedConfidence: 81,
    lifetimeSpendUsd: 6_140,
    predicted30dSpendUsd: 820,
    purchaseCount: 47,
    topCategories: ['pokemon', 'one_piece'],
    engagementScore: 74,
    winRate: 52,
    inferredBio:
      'TikTok ripper that flips singles same-week. Heavy modern Pokémon and One Piece. Lives on box breaks.',
    linkedAccounts: [
      linked('tiktok', 'breaknflip', 93, ['Username verbatim match', 'Streams cite CardCade username'], 62_000),
      linked('ebay', 'jchenbreaks', 84, ['Shared payout account', 'Sells cards pulled on TikTok within 48h']),
      linked('instagram', 'jordan.breaks', 76, ['Cross-posted TikTok content', 'Same link-in-bio']),
    ],
    predictions: [
      pred('pkm-umbreon-vmax-alt', 86, 62, 90, 'Sells every Alt Art he pulls within a week; high buy → flip pattern.', 0.92),
      pred('op-luffy-leader', 78, 70, 84, 'Just opened a Romance Dawn case on stream.', 0.95),
      pred('pkm-pikachu-xy-promo', 64, 88, 79, 'Low-cost promos fit his impulse buy band.'),
      pred('sp-brady-rookie', 12, 45, 88, 'No sports activity in last 12 months.'),
    ],
    recentActivity: [
      ev('a1', 1, 'purchase', 'cardcade', 'Bought Pikachu XY Promo lot', 240),
      ev('a2', 3, 'social_mention', 'tiktok', 'Live break: 8.4k viewers'),
      ev('a3', 5, 'sale', 'ebay', 'Sold Umbreon VMAX Alt PSA 9', 1650),
      ev('a4', 8, 'bid', 'cardcade', 'Outbid on Luffy Leader', 90),
    ],
  },
  {
    id: 'u-003',
    username: 'vintage_vera',
    displayName: 'Vera Whitfield',
    email: 'v.whitfield@example.com',
    joinedAt: '2023-11-04',
    persona: 'Vintage Hunter',
    unifiedConfidence: 89,
    lifetimeSpendUsd: 22_900,
    predicted30dSpendUsd: 2_900,
    purchaseCount: 38,
    topCategories: ['sports', 'other'],
    engagementScore: 68,
    winRate: 64,
    inferredBio:
      'Pre-1990 sports specialist. Long-time SCF forum poster, recently active on X with grading takes.',
    linkedAccounts: [
      linked('twitter', 'VeraVintage', 91, ['Bio mentions CardCade', 'Matching avatar across 3 platforms'], 11_300, true),
      linked('reddit', 'vera_vintage', 87, ['Posts in r/baseballcards weekly', 'Username similarity 0.92']),
      linked('ebay', 'verascards', 83, ['Same PO Box on shipping label']),
      linked('facebook', 'vera.whitfield.7', 55, ['Loose match — name + region only']),
    ],
    predictions: [
      pred('sp-jordan-fleer', 79, 84, 93, 'Searched "86 Fleer" 6x in last week; bid history on 3 copies.', 1.04),
      pred('sp-brady-rookie', 41, 70, 86, 'Modern-era; outside her usual era but trending in her network.'),
      pred('oth-bewd-1st', 33, 60, 78, 'Mentioned BEWD on Reddit but no purchase signals.'),
      pred('pkm-charizard-base-holo', 28, 65, 80, 'Crossover vintage interest.'),
    ],
    recentActivity: [
      ev('a1', 3, 'bid', 'cardcade', 'Bid on Jordan Fleer Rookie PSA 6', 1900),
      ev('a2', 7, 'search', 'cardcade', 'Searched "1986 Fleer Jordan"'),
      ev('a3', 12, 'social_mention', 'twitter', 'Tweet: "Fleer pop report needs an audit"'),
    ],
  },
  {
    id: 'u-004',
    username: 'piecehunter',
    displayName: 'Aiko Tanaka',
    email: 'aiko.t@example.com',
    joinedAt: '2024-05-30',
    persona: 'Set Builder',
    unifiedConfidence: 86,
    lifetimeSpendUsd: 9_870,
    predicted30dSpendUsd: 1_450,
    purchaseCount: 71,
    topCategories: ['one_piece'],
    engagementScore: 81,
    winRate: 58,
    inferredBio:
      'One Piece TCG super-fan building full Manga Rare runs. Active in Discord trade servers.',
    linkedAccounts: [
      linked('discord', 'piecehunter#4421', 92, ['Linked their CardCade in profile', 'Same email hash']),
      linked('instagram', 'piece.hunter.tcg', 88, ['Cross-promotes pulls']),
      linked('tiktok', 'piecehunter_op', 79, ['Same content within hours']),
    ],
    predictions: [
      pred('op-zoro-manga-rare', 92, 86, 95, 'Owns 7 of 11 Manga Rares; Zoro is a known gap.', 1.10),
      pred('op-shanks-leader', 74, 71, 87, 'Plays Shanks deck competitively.'),
      pred('op-luffy-leader', 68, 78, 84, 'Already owns 3; may upgrade grade.'),
      pred('pkm-pikachu-xy-promo', 18, 50, 72, 'Outside primary category.'),
    ],
    recentActivity: [
      ev('a1', 1, 'watchlist', 'cardcade', 'Added Zoro Manga Rare'),
      ev('a2', 2, 'purchase', 'cardcade', 'Bought Shanks Leader Parallel', 195),
      ev('a3', 5, 'social_mention', 'discord', 'Trade thread: "LF Zoro MR, HP TCG bulk"'),
    ],
  },
  {
    id: 'u-005',
    username: 'speculator99',
    displayName: 'Dmitri Volkov',
    email: 'dmitri.v@example.com',
    joinedAt: '2025-01-12',
    persona: 'Speculator',
    unifiedConfidence: 76,
    lifetimeSpendUsd: 14_500,
    predicted30dSpendUsd: 3_200,
    purchaseCount: 28,
    topCategories: ['pokemon', 'sports', 'one_piece'],
    engagementScore: 64,
    winRate: 49,
    inferredBio:
      'Buys what is trending. Heavy Twitter consumer of card-market accounts. Will pay above market for hot momentum.',
    linkedAccounts: [
      linked('twitter', 'd_volkov_cards', 84, ['Engages with 12 known flipper accounts daily']),
      linked('ebay', 'dvolkov_fast', 71, ['Same shipping name', 'Mostly buys, rarely sells']),
      linked('instagram', 'dmitri.collects', 60, ['Loose match — same first name + similar photos']),
    ],
    predictions: [
      pred('pkm-umbreon-vmax-alt', 73, 92, 81, 'Pays well above market on momentum cards.', 1.18),
      pred('op-shanks-leader', 66, 88, 78, 'Bought 2 hot OP cards above market last month.', 1.15),
      pred('sp-ohtani-bowman', 58, 84, 76, 'Searches spike around Ohtani news cycles.', 1.12),
      pred('pkm-charizard-base-holo', 24, 75, 70, 'Outside his typical price band.'),
    ],
    recentActivity: [
      ev('a1', 2, 'purchase', 'cardcade', 'Bought Umbreon VMAX above market', 2180),
      ev('a2', 4, 'search', 'cardcade', 'Searched "trending" 9 times'),
      ev('a3', 6, 'social_mention', 'twitter', 'Replied to @cardpurchase thread'),
    ],
  },
  {
    id: 'u-006',
    username: 'newkid42',
    displayName: 'Sam Patel',
    email: 'sam.p@example.com',
    joinedAt: '2026-04-28',
    persona: 'New Account',
    unifiedConfidence: 48,
    lifetimeSpendUsd: 95,
    predicted30dSpendUsd: 180,
    purchaseCount: 2,
    topCategories: ['pokemon'],
    engagementScore: 38,
    winRate: 100,
    inferredBio:
      'New signup. Sparse public footprint — only confident match is a Reddit profile created same week.',
    linkedAccounts: [
      linked('reddit', 'sam_p_42', 62, ['Account age matches signup', 'Same email-domain pattern']),
      linked('instagram', 'sam.patel.42', 41, ['Loose match — common name']),
    ],
    predictions: [
      pred('pkm-pikachu-xy-promo', 68, 80, 65, 'Entry-level price band fits new-user behavior.'),
      pred('pkm-mew-ancient-mew', 54, 75, 60, 'Affordable nostalgia pick.'),
      pred('pkm-charizard-base-holo', 6, 30, 72, 'Far above current spend band.'),
    ],
    recentActivity: [
      ev('a1', 1, 'purchase', 'cardcade', 'First purchase: Pikachu XY Promo', 65),
      ev('a2', 2, 'watchlist', 'cardcade', 'Added 3 cards under $50'),
    ],
  },
  {
    id: 'u-007',
    username: 'loyal_lana',
    displayName: 'Lana Rodriguez',
    email: 'lana.r@example.com',
    joinedAt: '2023-07-19',
    persona: 'Loyal Fan',
    unifiedConfidence: 91,
    lifetimeSpendUsd: 18_240,
    predicted30dSpendUsd: 2_100,
    purchaseCount: 96,
    topCategories: ['pokemon', 'one_piece'],
    engagementScore: 88,
    winRate: 66,
    inferredBio:
      'Daily-active user since 2023. Streams openings on TikTok with CardCade attribution.',
    linkedAccounts: [
      linked('tiktok', 'lanaopens', 94, ['Mentions CardCade by name weekly', 'Verified phone match'], 41_000, true),
      linked('instagram', 'lana.opens', 90, ['Same content cadence']),
      linked('ebay', 'lanarodriguezcards', 85, ['Linked from IG bio']),
      linked('facebook', 'lana.rodriguez.cards', 78, ['Same display photo']),
    ],
    predictions: [
      pred('pkm-umbreon-vmax-alt', 81, 78, 92, 'Stream audience expects modern Pokémon weekly.'),
      pred('op-luffy-leader', 73, 75, 88, 'Building One Piece content vertical.'),
      pred('pkm-lugia-neo-genesis', 42, 70, 80, 'Vintage curiosity, not yet purchased.'),
    ],
    recentActivity: [
      ev('a1', 1, 'purchase', 'cardcade', 'Bought Umbreon VMAX Alt PSA 8', 1480),
      ev('a2', 2, 'social_mention', 'tiktok', 'Stream: "CardCade haul Tuesday"'),
      ev('a3', 4, 'bid', 'cardcade', 'Winning bid on Luffy Leader', 105),
    ],
  },
  {
    id: 'u-008',
    username: 'bargainbin_bo',
    displayName: 'Bo Andersen',
    email: 'bo.a@example.com',
    joinedAt: '2024-10-08',
    persona: 'Bargain Hunter',
    unifiedConfidence: 72,
    lifetimeSpendUsd: 1_840,
    predicted30dSpendUsd: 240,
    purchaseCount: 34,
    topCategories: ['other', 'pokemon'],
    engagementScore: 59,
    winRate: 41,
    inferredBio:
      'Only bids under reserve. Sniper behavior at auction end. Active in r/pkmntcgcollections.',
    linkedAccounts: [
      linked('reddit', 'bargainbin_bo', 88, ['Username verbatim', 'Same bid timing pattern']),
      linked('ebay', 'b_andersen_cards', 70, ['Same ZIP region']),
    ],
    predictions: [
      pred('pkm-pikachu-xy-promo', 70, 35, 84, 'Will buy only if 20%+ below market.', 0.78),
      pred('oth-bewd-1st', 38, 28, 79, 'Watches but rarely bids above 70% of market.', 0.72),
      pred('pkm-mew-ancient-mew', 55, 40, 81, 'Fits sub-$80 sniping pattern.'),
    ],
    recentActivity: [
      ev('a1', 2, 'bid', 'cardcade', 'Sniped final bid (lost) on BEWD', 1100),
      ev('a2', 5, 'watchlist', 'cardcade', 'Watching 14 ending-soon auctions'),
    ],
  },
];

// ---------------------------------------------------------------------------
// Aggregate / dashboard data
// ---------------------------------------------------------------------------

export interface CategoryAffinity {
  category: AssetCategory;
  label: string;
  predictedSpendUsd: number;
  userCount: number;
}

export interface TopAssetForecast {
  assetId: string;
  name: string;
  category: AssetCategory;
  predictedBuyers: number;
  avgBuyLikelihood: number;
  totalPredictedSpendUsd: number;
}

export interface ConfidenceBucket {
  bucket: string;
  /** Number of unified identities in this confidence band */
  count: number;
}

export interface AnalyticsOverview {
  totalProfiles: number;
  unifiedIdentitiesLinked: number;
  avgIdentityConfidence: number;
  predicted30dSpendUsd: number;
  topPersonas: { persona: Persona; count: number }[];
  categoryAffinity: CategoryAffinity[];
  topAssets: TopAssetForecast[];
  confidenceDistribution: ConfidenceBucket[];
  /** Last 12 weeks of predicted vs. actual spend, USD */
  spendTrend: { week: string; predicted: number; actual: number }[];
}

export const MOCK_ANALYTICS_OVERVIEW: AnalyticsOverview = {
  totalProfiles: 12_847,
  unifiedIdentitiesLinked: 38_412,
  avgIdentityConfidence: 79,
  predicted30dSpendUsd: 1_284_500,
  topPersonas: [
    { persona: 'Casual Flipper', count: 4_120 },
    { persona: 'Set Builder', count: 2_840 },
    { persona: 'Bargain Hunter', count: 2_010 },
    { persona: 'Speculator', count: 1_460 },
    { persona: 'Whale Collector', count: 690 },
    { persona: 'Vintage Hunter', count: 580 },
    { persona: 'Loyal Fan', count: 540 },
    { persona: 'New Account', count: 607 },
  ],
  categoryAffinity: [
    { category: 'pokemon', label: 'Pokémon', predictedSpendUsd: 712_400, userCount: 7_840 },
    { category: 'one_piece', label: 'One Piece', predictedSpendUsd: 248_900, userCount: 3_120 },
    { category: 'sports', label: 'Sports', predictedSpendUsd: 241_300, userCount: 2_460 },
    { category: 'other', label: 'Other', predictedSpendUsd: 81_900, userCount: 1_180 },
  ],
  topAssets: [
    {
      assetId: 'pkm-umbreon-vmax-alt',
      name: 'Umbreon VMAX Alt Art (Moonbreon)',
      category: 'pokemon',
      predictedBuyers: 412,
      avgBuyLikelihood: 78,
      totalPredictedSpendUsd: 742_800,
    },
    {
      assetId: 'pkm-charizard-base-holo',
      name: 'Charizard — Base Set Holo (PSA 9)',
      category: 'pokemon',
      predictedBuyers: 38,
      avgBuyLikelihood: 71,
      totalPredictedSpendUsd: 168_400,
    },
    {
      assetId: 'op-luffy-leader',
      name: 'Monkey D. Luffy — OP01-001 Leader',
      category: 'one_piece',
      predictedBuyers: 920,
      avgBuyLikelihood: 64,
      totalPredictedSpendUsd: 92_100,
    },
    {
      assetId: 'sp-ohtani-bowman',
      name: 'Shohei Ohtani — Bowman Chrome Refractor',
      category: 'sports',
      predictedBuyers: 184,
      avgBuyLikelihood: 59,
      totalPredictedSpendUsd: 88_900,
    },
    {
      assetId: 'op-zoro-manga-rare',
      name: 'Zoro — Manga Rare OP01-025',
      category: 'one_piece',
      predictedBuyers: 142,
      avgBuyLikelihood: 67,
      totalPredictedSpendUsd: 47_200,
    },
  ],
  confidenceDistribution: [
    { bucket: '0-40', count: 3_140 },
    { bucket: '41-60', count: 6_820 },
    { bucket: '61-75', count: 11_240 },
    { bucket: '76-90', count: 12_910 },
    { bucket: '91-100', count: 4_302 },
  ],
  spendTrend: [
    { week: 'W1', predicted: 240, actual: 228 },
    { week: 'W2', predicted: 262, actual: 271 },
    { week: 'W3', predicted: 258, actual: 244 },
    { week: 'W4', predicted: 280, actual: 290 },
    { week: 'W5', predicted: 295, actual: 282 },
    { week: 'W6', predicted: 310, actual: 318 },
    { week: 'W7', predicted: 305, actual: 302 },
    { week: 'W8', predicted: 322, actual: 330 },
    { week: 'W9', predicted: 340, actual: 336 },
    { week: 'W10', predicted: 355, actual: 348 },
    { week: 'W11', predicted: 368, actual: 372 },
    { week: 'W12', predicted: 384, actual: 380 },
  ],
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const getMockAnalyticsUser = (id: string): AnalyticsUser | undefined =>
  MOCK_ANALYTICS_USERS.find(u => u.id === id);

export const formatUsd = (n: number): string =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(1)}k`
    : `$${n.toFixed(0)}`;

export const categoryLabel = (c: AssetCategory): string =>
  c === 'pokemon' ? 'Pokémon' : c === 'one_piece' ? 'One Piece' : c === 'sports' ? 'Sports' : 'Other';

export const platformLabel = (p: SocialPlatform): string =>
  ({
    ebay: 'eBay',
    instagram: 'Instagram',
    twitter: 'X (Twitter)',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    reddit: 'Reddit',
    discord: 'Discord',
  }[p]);
