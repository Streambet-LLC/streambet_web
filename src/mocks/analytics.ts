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
  /** True when an admin manually linked this account (vs. auto-matched). */
  manuallyLinked?: boolean;
}

/**
 * A scraped public account that *might* belong to this user but has not
 * been auto-linked. Surfaced to admins so they can confirm / reject.
 */
export interface MatchCandidate {
  handle: string;
  url: string;
  /** 0-100 model confidence — typically below auto-link threshold (≈60). */
  confidence: number;
  followers?: number;
  signals: string[];
}

/**
 * A platform we crawl but have not (yet) linked an account on for this user.
 * Includes any low-confidence candidates worth a human review.
 */
export interface UnmatchedPlatform {
  platform: SocialPlatform;
  /** Why we haven't matched yet, e.g. "Below confidence threshold" */
  reason: string;
  candidates: MatchCandidate[];
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
  /** Actual trailing-30-day spend (USD). Shown next to the predicted figure. */
  actual30dSpendUsd?: number;
  /** Total purchases on CardCade */
  purchaseCount: number;
  /** Primary collecting categories, ordered by affinity */
  topCategories: AssetCategory[];
  /** Engagement score 0-100 (logins, watchlist, bids) */
  engagementScore: number;
  /** % of bids that converted to a win in last 90d */
  winRate: number;
  linkedAccounts: LinkedAccount[];
  /** Platforms where we haven't linked an account yet (with candidates). */
  unmatchedPlatforms?: UnmatchedPlatform[];
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
// Expand every user's predictions to a consistent minimum length so the
// detail view always has enough rows to demo scrolling. Each filler entry
// is derived deterministically from the asset + user id so it stays stable
// across reloads.
// ---------------------------------------------------------------------------

const TARGET_PREDICTIONS_PER_USER = 10;

const FILLER_RATIONALES = [
  'Marginal cross-category interest based on co-view patterns.',
  'Surfaces in lookalike cohort of similar collectors.',
  'Followed creators mentioned this asset recently.',
  'Wishlist overlap with users who bought this in last 90d.',
  'Price band fits historical purchase distribution.',
  'Recently searched a related set; low-conviction signal.',
  'Aftermarket comps trending up in their region.',
  'Engagement on adjacent asset pages on CardCade.',
];

const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

for (const user of MOCK_ANALYTICS_USERS) {
  const existing = new Set(user.predictions.map(p => p.assetId));
  const candidates = MOCK_ASSETS.filter(a => !existing.has(a.assetId));
  let i = 0;
  while (user.predictions.length < TARGET_PREDICTIONS_PER_USER && i < candidates.length) {
    const asset = candidates[i++];
    const seed = hashStr(user.id + asset.assetId);
    // Filler predictions are intentionally low-to-mid conviction so they
    // sit below the curated ones when sorted.
    const buy = 8 + (seed % 38); // 8..45
    const pay = 35 + ((seed >> 3) % 45); // 35..79
    const conf = 55 + ((seed >> 5) % 30); // 55..84
    const ceilingMult = 0.85 + ((seed >> 7) % 20) / 100; // 0.85..1.04
    const rationale = FILLER_RATIONALES[(seed >> 9) % FILLER_RATIONALES.length];
    user.predictions.push(pred(asset.assetId, buy, pay, conf, rationale, ceilingMult));
  }
  // Sort so highest-conviction predictions stay at the top.
  user.predictions.sort((a, b) => b.buyLikelihood - a.buyLikelihood);
}

// ---------------------------------------------------------------------------
// Backfill unmatched-platform candidates for every user. For each platform
// the user does *not* already have a linked account on, we generate 0-3
// low-confidence candidates so admins have something to review.
// ---------------------------------------------------------------------------

const ALL_PLATFORMS: SocialPlatform[] = [
  'ebay',
  'instagram',
  'twitter',
  'tiktok',
  'facebook',
  'reddit',
  'discord',
];

const UNMATCH_REASONS = [
  'Below confidence threshold',
  'Multiple candidates — needs disambiguation',
  'No scraper signal in last 90 days',
  'Conflicting region metadata',
];

const CANDIDATE_SIGNAL_POOL = [
  'Username token overlap',
  'Display name fuzzy match',
  'Same first name + city',
  'Mutual followers with linked accounts',
  'Avatar pHash distance 0.18',
  'Posted same asset within 24h',
  'Bio mentions trading cards',
  'Engagement on linked X account',
];

const buildCandidate = (
  platform: SocialPlatform,
  handle: string,
  seed: number,
): MatchCandidate => {
  const confidence = 22 + (seed % 33); // 22..54 (below auto-link)
  const followerSeed = (seed >> 4) % 100;
  const followers = followerSeed > 30 ? 200 + ((seed >> 6) % 18_000) : undefined;
  const sigCount = 2 + (seed % 2);
  const signals: string[] = [];
  for (let i = 0; i < sigCount; i++) {
    const s = CANDIDATE_SIGNAL_POOL[(seed >> (i * 3)) % CANDIDATE_SIGNAL_POOL.length];
    if (!signals.includes(s)) signals.push(s);
  }
  const urlBase =
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
      : `https://discord.com/users/${handle}`;
  return { handle, url: urlBase, confidence, followers, signals };
};

const slugifyHandle = (s: string, suffix = ''): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 14) + suffix;

for (const user of MOCK_ANALYTICS_USERS) {
  if (user.unmatchedPlatforms) continue;
  const matched = new Set(user.linkedAccounts.map(a => a.platform));
  const missing = ALL_PLATFORMS.filter(p => !matched.has(p));
  const out: UnmatchedPlatform[] = [];
  for (const platform of missing) {
    const seed = hashStr(user.id + platform);
    // Decide how many candidates to surface (0, 1, 2, or 3). Bias toward 1-2.
    const n = [1, 2, 1, 0, 2, 3, 1][seed % 7];
    const candidates: MatchCandidate[] = [];
    const baseHandles = [
      slugifyHandle(user.username),
      slugifyHandle(user.displayName.split(' ').join('.')),
      slugifyHandle(user.username, String(seed % 100)),
    ];
    for (let i = 0; i < n; i++) {
      const handle = baseHandles[i] || slugifyHandle(user.username, '_' + i);
      candidates.push(buildCandidate(platform, handle, seed + i * 7919));
    }
    const reason =
      n === 0
        ? 'No scraper signal in last 90 days'
        : UNMATCH_REASONS[seed % UNMATCH_REASONS.length];
    out.push({ platform, reason, candidates });
  }
  user.unmatchedPlatforms = out;
}

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
  /** Actual trailing-30-day spend (companion to the predicted figure). */
  actual30dSpendUsd: number;
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
  actual30dSpendUsd: 1_192_300,
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

// ---------------------------------------------------------------------------
// Scrapers — mock pipeline status for the admin Scrapers tab.
// ---------------------------------------------------------------------------

export type ScraperStatus = 'running' | 'idle' | 'degraded' | 'error' | 'paused';

export type ScraperKind =
  | 'listings'
  | 'sold_comps'
  | 'profiles'
  | 'posts'
  | 'engagement'
  | 'video_meta'
  | 'comments'
  | 'pages'
  | 'threads';

export interface ScraperError {
  at: string; // ISO
  code: string;
  message: string;
  count: number;
}

export interface ScraperPipeline {
  id: string;
  platform: SocialPlatform;
  /** Short descriptor, e.g. "eBay Sold Comps" */
  name: string;
  kind: ScraperKind;
  status: ScraperStatus;
  /** Strategy used to access the source */
  strategy: 'official_api' | 'public_html' | 'graphql' | 'rss' | 'mobile_api';
  /** Region / cluster this worker pool runs in */
  region: 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1';
  /** Cron-like schedule for human readability */
  schedule: string;
  lastRunAt: string; // ISO
  nextRunAt: string; // ISO
  /** Last 24h success rate, 0-100 */
  successRate24h: number;
  /** Items successfully scraped in last 24h */
  itemsScraped24h: number;
  /** Lifetime items scraped */
  itemsScrapedTotal: number;
  /** Avg request latency in ms (last 24h) */
  avgLatencyMs: number;
  /** Pending jobs in queue */
  queueDepth: number;
  /** Number of proxy / token rotations used in last 24h */
  rotations24h: number;
  /** Per-hour throughput buckets, oldest → newest (24 entries) */
  throughput24h: { hour: string; count: number }[];
  /** Recent errors (most recent first) */
  recentErrors: ScraperError[];
  /** Free-form note shown under the card */
  note?: string;
}

const hoursAgoISO = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const minutesAgoISO = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const minutesFromNowISO = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

/** Generate a 24-hour throughput series with a smooth diurnal curve. */
const makeThroughput = (peak: number, variance = 0.25, downscale = false): { hour: string; count: number }[] => {
  const series: { hour: string; count: number }[] = [];
  const nowHour = new Date();
  nowHour.setMinutes(0, 0, 0);
  for (let i = 23; i >= 0; i--) {
    const d = new Date(nowHour.getTime() - i * 3_600_000);
    const hour = d.getHours();
    // Diurnal: low at 3-6am UTC, peak 14-20 UTC
    const diurnal = 0.45 + 0.55 * Math.sin(((hour - 4) / 24) * Math.PI * 2 * 0.5 + Math.PI / 2);
    const jitter = 1 + (((i * 7919) % 100) / 100 - 0.5) * variance;
    const raw = peak * Math.max(0.1, diurnal) * jitter;
    const count = Math.max(0, Math.round(downscale && i < 3 ? raw * 0.15 : raw));
    series.push({
      hour: `${String(d.getHours()).padStart(2, '0')}:00`,
      count,
    });
  }
  return series;
};

export const MOCK_SCRAPERS: ScraperPipeline[] = [
  {
    id: 'ebay-listings-us',
    platform: 'ebay',
    name: 'eBay Active Listings',
    kind: 'listings',
    status: 'running',
    strategy: 'official_api',
    region: 'us-east-1',
    schedule: 'every 5 min',
    lastRunAt: minutesAgoISO(2),
    nextRunAt: minutesFromNowISO(3),
    successRate24h: 99.4,
    itemsScraped24h: 184_220,
    itemsScrapedTotal: 42_118_904,
    avgLatencyMs: 312,
    queueDepth: 84,
    rotations24h: 12,
    throughput24h: makeThroughput(8200),
    recentErrors: [
      { at: hoursAgoISO(6), code: '429', message: 'Rate limit hit on Finding API — backed off 30s', count: 3 },
    ],
    note: 'Primary listing crawler covering 14 TCG categories.',
  },
  {
    id: 'ebay-sold-comps',
    platform: 'ebay',
    name: 'eBay Sold Comps',
    kind: 'sold_comps',
    status: 'running',
    strategy: 'official_api',
    region: 'us-east-1',
    schedule: 'every 15 min',
    lastRunAt: minutesAgoISO(7),
    nextRunAt: minutesFromNowISO(8),
    successRate24h: 98.1,
    itemsScraped24h: 41_905,
    itemsScrapedTotal: 9_204_771,
    avgLatencyMs: 488,
    queueDepth: 12,
    rotations24h: 4,
    throughput24h: makeThroughput(1850),
    recentErrors: [],
    note: 'Drives payment-percentile predictions.',
  },
  {
    id: 'ebay-watchlist-events',
    platform: 'ebay',
    name: 'eBay Watchlist Events',
    kind: 'listings',
    status: 'running',
    strategy: 'official_api',
    region: 'us-east-1',
    schedule: 'every 5 min',
    lastRunAt: minutesAgoISO(1),
    nextRunAt: minutesFromNowISO(4),
    successRate24h: 99.2,
    itemsScraped24h: 58_140,
    itemsScrapedTotal: 6_804_220,
    avgLatencyMs: 224,
    queueDepth: 18,
    rotations24h: 2,
    throughput24h: makeThroughput(2600),
    recentErrors: [],
  },
  {
    id: 'instagram-posts',
    platform: 'instagram',
    name: 'Instagram Post Stream',
    kind: 'posts',
    status: 'running',
    strategy: 'graphql',
    region: 'us-west-2',
    schedule: 'continuous',
    lastRunAt: minutesAgoISO(1),
    nextRunAt: minutesFromNowISO(1),
    successRate24h: 96.5,
    itemsScraped24h: 62_904,
    itemsScrapedTotal: 8_904_122,
    avgLatencyMs: 740,
    queueDepth: 38,
    rotations24h: 22,
    throughput24h: makeThroughput(2800),
    recentErrors: [],
  },
  {
    id: 'instagram-stories',
    platform: 'instagram',
    name: 'Instagram Stories Sampler',
    kind: 'posts',
    status: 'running',
    strategy: 'graphql',
    region: 'us-west-2',
    schedule: 'every 5 min',
    lastRunAt: minutesAgoISO(2),
    nextRunAt: minutesFromNowISO(3),
    successRate24h: 96.8,
    itemsScraped24h: 21_410,
    itemsScrapedTotal: 2_440_009,
    avgLatencyMs: 612,
    queueDepth: 9,
    rotations24h: 14,
    throughput24h: makeThroughput(940),
    recentErrors: [],
  },
  {
    id: 'twitter-engagement',
    platform: 'twitter',
    name: 'X Engagement Graph',
    kind: 'engagement',
    status: 'running',
    strategy: 'official_api',
    region: 'us-east-1',
    schedule: 'every 2 min',
    lastRunAt: minutesAgoISO(1),
    nextRunAt: minutesFromNowISO(1),
    successRate24h: 97.8,
    itemsScraped24h: 244_120,
    itemsScrapedTotal: 31_004_822,
    avgLatencyMs: 218,
    queueDepth: 6,
    rotations24h: 1,
    throughput24h: makeThroughput(10_400),
    recentErrors: [
      { at: hoursAgoISO(9), code: '503', message: 'Upstream timeout on /2/users/by — retried', count: 7 },
    ],
  },
  {
    id: 'twitter-mentions',
    platform: 'twitter',
    name: 'X Brand Mention Stream',
    kind: 'posts',
    status: 'running',
    strategy: 'official_api',
    region: 'us-east-1',
    schedule: 'continuous',
    lastRunAt: minutesAgoISO(1),
    nextRunAt: minutesFromNowISO(1),
    successRate24h: 98.4,
    itemsScraped24h: 88_402,
    itemsScrapedTotal: 11_402_007,
    avgLatencyMs: 198,
    queueDepth: 3,
    rotations24h: 0,
    throughput24h: makeThroughput(3700),
    recentErrors: [],
  },
  {
    id: 'tiktok-video-meta',
    platform: 'tiktok',
    name: 'TikTok Video Metadata',
    kind: 'video_meta',
    status: 'running',
    strategy: 'mobile_api',
    region: 'ap-southeast-1',
    schedule: 'every 5 min',
    lastRunAt: minutesAgoISO(3),
    nextRunAt: minutesFromNowISO(2),
    successRate24h: 94.2,
    itemsScraped24h: 38_220,
    itemsScrapedTotal: 5_017_004,
    avgLatencyMs: 612,
    queueDepth: 120,
    rotations24h: 34,
    throughput24h: makeThroughput(1600, 0.35),
    recentErrors: [
      { at: hoursAgoISO(1), code: 'SIGN_FAIL', message: 'X-Bogus signature drift detected, regenerated', count: 4 },
    ],
  },
  {
    id: 'reddit-threads',
    platform: 'reddit',
    name: 'Reddit r/tcg Threads',
    kind: 'threads',
    status: 'running',
    strategy: 'official_api',
    region: 'us-east-1',
    schedule: 'every 10 min',
    lastRunAt: minutesAgoISO(6),
    nextRunAt: minutesFromNowISO(4),
    successRate24h: 99.9,
    itemsScraped24h: 14_802,
    itemsScrapedTotal: 2_104_998,
    avgLatencyMs: 184,
    queueDepth: 2,
    rotations24h: 0,
    throughput24h: makeThroughput(640),
    recentErrors: [],
  },
  {
    id: 'reddit-mentions',
    platform: 'reddit',
    name: 'Reddit Card Mentions',
    kind: 'comments',
    status: 'running',
    strategy: 'official_api',
    region: 'us-east-1',
    schedule: 'every 10 min',
    lastRunAt: minutesAgoISO(4),
    nextRunAt: minutesFromNowISO(6),
    successRate24h: 98.5,
    itemsScraped24h: 22_018,
    itemsScrapedTotal: 3_088_140,
    avgLatencyMs: 192,
    queueDepth: 0,
    rotations24h: 0,
    throughput24h: makeThroughput(910),
    recentErrors: [],
  },
  {
    id: 'discord-servers',
    platform: 'discord',
    name: 'Discord Public Servers',
    kind: 'posts',
    status: 'idle',
    strategy: 'official_api',
    region: 'us-east-1',
    schedule: 'every 1 hr',
    lastRunAt: minutesAgoISO(28),
    nextRunAt: minutesFromNowISO(32),
    successRate24h: 100,
    itemsScraped24h: 8_410,
    itemsScrapedTotal: 1_402_910,
    avgLatencyMs: 142,
    queueDepth: 0,
    rotations24h: 0,
    throughput24h: makeThroughput(380),
    recentErrors: [],
  },
  {
    id: 'tiktok-comments',
    platform: 'tiktok',
    name: 'TikTok Comment Mining',
    kind: 'comments',
    status: 'paused',
    strategy: 'mobile_api',
    region: 'ap-southeast-1',
    schedule: 'every 30 min',
    lastRunAt: hoursAgoISO(14),
    nextRunAt: minutesFromNowISO(60),
    successRate24h: 0,
    itemsScraped24h: 0,
    itemsScrapedTotal: 920_115,
    avgLatencyMs: 0,
    queueDepth: 0,
    rotations24h: 0,
    throughput24h: makeThroughput(0),
    recentErrors: [],
    note: 'Paused pending updated ToS review (legal queue).',
  },
  {
    id: 'instagram-profiles',
    platform: 'instagram',
    name: 'Instagram Profile Resolver',
    kind: 'profiles',
    status: 'degraded',
    strategy: 'public_html',
    region: 'us-west-2',
    schedule: 'every 10 min',
    lastRunAt: minutesAgoISO(4),
    nextRunAt: minutesFromNowISO(6),
    successRate24h: 55.2,
    itemsScraped24h: 9_412,
    itemsScrapedTotal: 1_287_119,
    avgLatencyMs: 1_140,
    queueDepth: 412,
    rotations24h: 87,
    throughput24h: makeThroughput(520, 0.4),
    recentErrors: [
      { at: minutesAgoISO(22), code: 'CHALLENGE', message: 'Login challenge interstitial on residential proxy', count: 18 },
      { at: hoursAgoISO(2), code: '403', message: 'Forbidden — rotating session cookies', count: 41 },
    ],
    note: 'Elevated challenge rate from IG since 04:00 UTC. Auto-rotating.',
  },
  {
    id: 'facebook-pages',
    platform: 'facebook',
    name: 'Facebook Pages Crawl',
    kind: 'pages',
    status: 'error',
    strategy: 'graphql',
    region: 'eu-west-1',
    schedule: 'every 20 min',
    lastRunAt: minutesAgoISO(18),
    nextRunAt: minutesFromNowISO(2),
    successRate24h: 10.0,
    itemsScraped24h: 2_104,
    itemsScrapedTotal: 612_398,
    avgLatencyMs: 1_840,
    queueDepth: 904,
    rotations24h: 142,
    throughput24h: makeThroughput(380, 0.5, true),
    recentErrors: [
      { at: minutesAgoISO(8), code: 'CHECKPOINT', message: 'Account checkpoint flow blocking session', count: 62 },
      { at: minutesAgoISO(45), code: '190', message: 'OAuth token invalidated — refresh failed', count: 28 },
      { at: hoursAgoISO(3), code: 'NET', message: 'Connection reset by peer', count: 14 },
    ],
    note: 'Token refresh pipeline failing since 09:12 UTC. On-call paged.',
  },
];

export const scraperStatusLabel = (s: ScraperStatus): string =>
  ({
    running: 'Running',
    idle: 'Idle',
    degraded: 'Degraded',
    error: 'Error',
    paused: 'Paused',
  }[s]);
