import type { AuctionCategory, AuctionStatus, FundingMethod } from '@/integrations/api/hermes';

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

/** Buyer premium on the hammer, half-up to the cent. Mirrors the API's math. */
export function buyerPremiumFor(hammer: number, pct: number): number {
  if (hammer <= 0 || !(pct > 0)) return 0;
  return Math.round((Math.round(hammer * 100) * pct) / 100) / 100;
}

/** Card processing the API passes through (grossed up to net 2.9% + 30¢). */
export function cardFeeFor(subtotal: number, pct = 2.9, fixed = 0.3): number {
  if (subtotal <= 0) return 0;
  const gross = (subtotal + fixed) / (1 - pct / 100);
  return Math.round((Math.ceil(gross * 100) / 100 - subtotal) * 100) / 100;
}
