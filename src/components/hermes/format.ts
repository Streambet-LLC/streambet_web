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

/** Card processing the API passes through (grossed up to net 2.9% + 30¢). */
export function cardFeeFor(subtotal: number, pct = 2.9, fixed = 0.3): number {
  if (subtotal <= 0) return 0;
  const gross = (subtotal + fixed) / (1 - pct / 100);
  return Math.round((Math.ceil(gross * 100) / 100 - subtotal) * 100) / 100;
}
