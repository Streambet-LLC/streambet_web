/**
 * Shared PSA (Professional Sports Authenticator) helper functions
 * Used by both SellerShopManage and admin PrizeConfiguration
 */

import { PrizeBrand, PsaImportResult } from '@/types/prize';

// Constants
export const PSA_RATE_LIMIT_MESSAGE = 'PSA is rate-limiting requests right now. Try again tomorrow.';
export const PSA_RATE_LIMIT_UNTIL_KEY = 'psa.rateLimitedUntil';

const SPORTS_KEYWORDS = [
  'SPORT',
  'FOOTBALL',
  'BASKETBALL',
  'BASEBALL',
  'HOCKEY',
  'SOCCER',
  'GOLF',
  'TENNIS',
  'RACING',
  'MOTORSPORT',
  'MOTORSPORTS',
  'FORMULA',
  'FORMULA ONE',
  'FORMULA 1',
  'F1',
  'GRAND PRIX',
  'RACE',
  'DRIVER',
  'NASCAR',
  'INDYCAR',
  'LE MANS',
  'MOTOGP',
  'MOTO GP',
  'NHL',
  'NFL',
  'NBA',
  'MLB',
];

const isSportsLike = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const normalized = value.toUpperCase().trim();
  return SPORTS_KEYWORDS.some(keyword => normalized.includes(keyword));
};

/**
 * Normalize PSA brand to app brand enum
 * Maps PSA brand string to our internal brand types
 */
export const normalizePsaBrand = (brand: string | null | undefined): PrizeBrand => {
  const normalized = (brand || '').toLowerCase().trim();
  if (normalized.includes('pokemon')) return 'pokemon';
  if (normalized.includes('one piece')) return 'one_piece';
  if (isSportsLike(normalized)) return 'sports';
  return 'other';
};

/**
 * Detect if PSA category is sports-related
 * Maps sports categories (FOOTBALL, BASKETBALL, BASEBALL, HOCKEY, etc.) to 'sports' brand
 */
export const normalizePsaSportsCategory = (category: string | null | undefined): PrizeBrand | null => {
  return isSportsLike(category) ? 'sports' : null;
};

/**
 * Resolve PSA import brand using category + metadata fallbacks.
 * This catches cases where PSA category is generic but title/brand fields
 * contain sports signals like Formula 1.
 */
export const resolvePsaBrandFromImport = (result: PsaImportResult): PrizeBrand => {
  const candidates = [
    result.category,
    result.brand,
    result.title,
    result.subject,
    result.variety,
    result.itemInformation?.brandTitle,
    result.itemInformation?.category,
    result.itemInformation?.subject,
    result.description,
  ];

  for (const candidate of candidates) {
    if (isSportsLike(candidate)) {
      return 'sports';
    }
  }

  return normalizePsaBrand(result.brand);
};

/**
 * Normalize a numeric grade value to PSA slab format (1-10, or x.5)
 */
export const normalizeSlabGradeValue = (raw: number): string => {
  const clamped = Math.min(10, Math.max(1, raw));
  const normalized = Number.isInteger(clamped)
    ? clamped
    : Math.min(9.5, Math.floor(clamped) + 0.5);
  return String(normalized);
};

/**
 * Parse PSA slab grade from the import result
 * Tries multiple sources (cardGrade, itemGrade, gradeDescription)
 * Handles formats like "GEM MT 10", "MINT 9Q", "8.5", "10"
 */
export const parsePsaSlabGrade = (result: PsaImportResult): string | null => {
  const candidates = [
    result.cardGrade,
    result.itemInformation?.itemGrade,
    result.gradeDescription,
  ].filter((value): value is string => Boolean(value && value.trim()));

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) {
      return normalizeSlabGradeValue(direct);
    }

    // Handles values like "GEM MT 10", "MINT 9Q", "8.5".
    const match = trimmed.match(/(\d+(?:\.\d+)?)(?:\s*[Qq])?\s*$/);
    if (!match) {
      continue;
    }

    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      return normalizeSlabGradeValue(parsed);
    }
  }

  return null;
};

/**
 * Get tomorrow's start time in milliseconds
 */
export const getTomorrowStartMs = (): number => {
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow.getTime();
};

/**
 * Activate PSA rate limit cooldown
 * Returns the timestamp until which the rate limit applies
 */
export const activatePsaRateLimitCooldown = (untilIso?: string | null): number => {
  const parsed = untilIso ? Date.parse(untilIso) : NaN;
  const fallback = getTomorrowStartMs();
  const until = Number.isFinite(parsed) ? Math.max(parsed, Date.now()) : fallback;

  localStorage.setItem(PSA_RATE_LIMIT_UNTIL_KEY, String(until));
  return until;
};

/**
 * Clear PSA rate limit cooldown
 */
export const clearPsaRateLimitCooldown = (): void => {
  localStorage.removeItem(PSA_RATE_LIMIT_UNTIL_KEY);
};

/**
 * Get stored PSA rate limit timestamp (if any)
 */
export const getStoredPsaRateLimitUntil = (): number | null => {
  const stored = localStorage.getItem(PSA_RATE_LIMIT_UNTIL_KEY);
  if (!stored) {
    return null;
  }

  const until = Number(stored);
  if (!Number.isFinite(until) || Date.now() >= until) {
    clearPsaRateLimitCooldown();
    return null;
  }

  return until;
};

/**
 * Check if PSA rate limit is currently active
 */
export const isPsaRateLimitActive = (rateLimitedUntil: number | null): boolean => {
  return Boolean(rateLimitedUntil && Date.now() < rateLimitedUntil);
};
