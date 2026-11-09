import type {
  AuctionCategory,
  AuctionStatus,
  FundingMethod,
  PremiumRates,
} from '@/integrations/api/hermes';

/** Hermes brand lime, sampled from the logo. Use literal `#C7FA09` in classes. */
export const HERMES_LIME = '#C7FA09';

export const CATEGORY_LABEL: Record<AuctionCategory, string> = {
  sports_cards: 'Sports Cards',
  tcg: 'TCG',
  sports_memorabilia: 'Sports Memorabilia',
};

export const CATEGORIES: AuctionCategory[] = ['sports_cards', 'tcg', 'sports_memorabilia'];

export const STATUS_LABEL: Record<AuctionStatus, string> = {
  scheduled: 'Upcoming',
  active: 'Live',
  ended: 'Awaiting payment',
  paid: 'Sold',
  unsold: 'Unsold',
  failed: 'Payment failed',
  cancelled: 'Cancelled',
};

export const METHOD_LABEL: Record<FundingMethod, string> = {
  card: 'Card',
  ach: 'Bank (ACH)',
  usdc: 'USDC',
};

export function fmtUsd(n: number | null | undefined, opts: { cents?: boolean } = {}): string {
  if (n == null || Number.isNaN(n)) return '—';
  const cents = opts.cents ?? !Number.isInteger(n);
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

/** Est. Value as shown to bidders: "$450" or "$400 – $600". */
export function fmtEstValue(usd: number | null | undefined, highUsd?: number | null): string {
  return highUsd != null && usd != null ? `${fmtUsd(usd)} – ${fmtUsd(highUsd)}` : fmtUsd(usd);
}

export function fmtDateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "2d 4h", "3h 12m", "45s" — compact time left until `ms` from now. */
export function fmtRemaining(ms: number): string {
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Stripe's card `brand` codes → how cardholders know them. */
const CARD_BRAND: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  cartes_bancaires: 'Cartes Bancaires',
  eftpos_au: 'eftpos',
  interac: 'Interac',
  link: 'Link',
};

/** "Visa", "American Express"; bank names in title case if Stripe sent ALL CAPS. */
export function fmtMethodLabel(m: { kind: 'card' | 'ach'; label: string }): string {
  const raw = (m.label || '').trim();
  if (m.kind === 'card') {
    const known = CARD_BRAND[raw.toLowerCase()];
    if (known) return known;
    if (!raw || raw === 'card' || raw === 'unknown') return 'Card';
    return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  if (!raw) return 'Bank account';
  return raw === raw.toUpperCase() ? raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : raw;
}

/** Soft-close window when the API doesn't send `extensionWindowSeconds`. */
export const DEFAULT_EXTENSION_WINDOW_SECONDS = 120;

/** "2 minutes", "1 minute", "30 seconds". */
export function fmtExtensionWindow(seconds = DEFAULT_EXTENSION_WINDOW_SECONDS): string {
  if (seconds % 60 === 0) {
    const m = seconds / 60;
    return `${m} minute${m === 1 ? '' : 's'}`;
  }
  return `${seconds} seconds`;
}

/**
 * Buyer fee by tender for new lots, all-in (mirrors the API's
 * `BUYER_PREMIUM_RATES`). Used only until `/auctions/config` loads.
 */
export const DEFAULT_PREMIUM_RATES: PremiumRates = { card: 4, ach: 1, usdc: 1 };

/** Rates by tender from an auction's (or the config's) `fees`; older APIs sent one rate for all. */
export function premiumRates(
  fees?: { buyerPremiumPercent?: number; buyerPremiumByMethod?: PremiumRates } | null
): PremiumRates {
  if (fees?.buyerPremiumByMethod) return fees.buyerPremiumByMethod;
  const flat = fees?.buyerPremiumPercent;
  return flat != null ? { card: flat, ach: flat, usdc: flat } : DEFAULT_PREMIUM_RATES;
}

const TIER_LABEL: Record<FundingMethod, string> = { card: 'card', ach: 'ACH', usdc: 'USDC' };

/** "4% card · 1% ACH · 1% USDC" (only the given tenders, in that order). */
export function fmtFeeTiers(
  rates: PremiumRates,
  methods: FundingMethod[] = ['card', 'ach', 'usdc']
): string {
  return (['card', 'ach', 'usdc'] as FundingMethod[])
    .filter(m => methods.includes(m))
    .map(m => `${rates[m]}% ${TIER_LABEL[m]}`)
    .join(' · ');
}

/** Buyer premium on the hammer, half-up to the cent. Mirrors the API's math. */
export function buyerPremiumFor(hammer: number, pct: number): number {
  if (hammer <= 0 || !(pct > 0)) return 0;
  return Math.round((Math.round(hammer * 100) * pct) / 100) / 100;
}
