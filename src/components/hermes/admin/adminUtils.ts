import { useEffect, useState } from 'react';
import type { AuctionVideo, EstValueMeta } from '@/integrations/api/hermes';
import { getMessage } from '@/utils/helper';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const MIN_LENGTH_MS = HOUR_MS;
export const MAX_LENGTH_MS = 60 * DAY_MS;

export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const MAX_IMAGES = 24;
export const MAX_VIDEOS = 6;

/** Shared field look for the dark admin (inputs, selects, native textareas). */
export const FIELD_CLASS =
  'border-white/10 bg-black/40 text-white placeholder:text-white/30 focus-visible:ring-[#C7FA09]/60 focus-visible:ring-offset-0';
export const NATIVE_FIELD_CLASS =
  'w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]/60 disabled:cursor-not-allowed disabled:opacity-50';
export const LIME_BUTTON_CLASS =
  'bg-[#C7FA09] font-semibold text-black hover:bg-[#d6ff3d] focus-visible:ring-[#C7FA09]/60';
export const GHOST_BUTTON_CLASS =
  'border-white/10 bg-black/40 text-white/80 hover:bg-white/5 hover:text-white';

/** Toast-ready message for an axios (or any) error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  return getMessage(err) || fallback;
}

/** `Date` → value for `<input type="datetime-local">` (local wall time). */
export function toLocalInput(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** `datetime-local` value (local wall time) → `Date`, or null when blank/invalid. */
export function fromLocalInput(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Next whole hour at least 30 minutes out — a sensible default schedule time. */
export function defaultScheduleStart(now = Date.now()): Date {
  const d = new Date(now + 30 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/** "Nov 18, 3:00 PM" (adds the year when it isn't this year). */
export function fmtShortDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "7 days", "3d 4h", "5h 30m" — a span length for the form. */
export function fmtSpan(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMin = Math.round(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0 && h === 0 && m === 0) return `${d} day${d === 1 ? '' : 's'}`;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return m ? `${h}h ${m}m` : `${h} hour${h === 1 ? '' : 's'}`;
  return `${m}m`;
}

/** "2.4 MB" */
export function fmtBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/**
 * Mirrors the API's `toEmbed`: returns the provider when `url` is a YouTube
 * or Vimeo link the server will accept, else null.
 */
export function detectVideoLink(raw: string): Exclude<AuctionVideo['kind'], 'upload'> | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (
    host === 'youtu.be' ||
    host.endsWith('youtube.com') ||
    host.endsWith('youtube-nocookie.com')
  ) {
    const id =
      host === 'youtu.be'
        ? u.pathname.slice(1)
        : u.searchParams.get('v') || u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1];
    return id && /^[\w-]{6,}$/.test(id) ? 'youtube' : null;
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    return /(\d{6,})/.test(u.pathname) ? 'vimeo' : null;
  }
  return null;
}

/** Parses a USD text field. `null` = blank, `NaN` = not a number. */
export function parseUsd(s: string): number | null {
  const t = s.trim().replace(/[$,]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function hasAtMostCents(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Wall clock that re-renders every `intervalMs` (pass 0 to pause). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!intervalMs) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function shortAddress(addr: string | null | undefined, chars = 4): string {
  if (!addr) return '—';
  return addr.length <= chars * 2 + 1 ? addr : `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

const VALUE_METHOD_LABEL: Record<string, string> = {
  'anchor-and-adjust': 'Anchor & adjust',
  'recent-median': 'Recent median',
  triangulation: 'Triangulation',
  'recent-sales': 'Recent sales',
};

export function valueMethodLabel(m: string | null | undefined): string {
  if (!m) return '—';
  return VALUE_METHOD_LABEL[m] ?? m.replace(/[-_]+/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

/** "2025-10-14" → "Oct 14, 2025"; passes other strings through. */
export function fmtDay(s: string | null | undefined): string {
  if (!s) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Est. value form state. With `range` on, `amount` is the low end and `high`
 * the top; otherwise `amount` is the single value. `accepted` is the
 * recommendation the admin chose with "Use …"; the value counts as `pulled`
 * only while the inputs still equal it (any edit makes it `manual`).
 */
export interface EstValueState {
  mode: 'pull' | 'manual';
  range: boolean;
  amount: string;
  high: string;
  accepted: { meta: EstValueMeta; usd: number; highUsd: number | null } | null;
}

const sameCents = (a: number | null, b: number | null) =>
  a == null || b == null ? a === b : roundCents(a) === roundCents(b);

export function estValueSource(s: EstValueState): 'manual' | 'pulled' | null {
  const n = parseUsd(s.amount);
  if (n == null || Number.isNaN(n)) return null;
  const high = s.range ? parseUsd(s.high) : null;
  return s.mode === 'pull' &&
    s.accepted &&
    sameCents(n, s.accepted.usd) &&
    sameCents(high, s.accepted.highUsd)
    ? 'pulled'
    : 'manual';
}

/**
 * "Use …" target for a recommendation: its range when the form is in range
 * mode (and the pull returned one), else the point estimate.
 */
export function recommendedEstValue(
  rec: EstValueMeta,
  range: boolean
): { usd: number; highUsd: number | null } | null {
  if (range && rec.lowUsd != null && rec.highUsd != null && rec.highUsd > rec.lowUsd) {
    return { usd: roundCents(rec.lowUsd), highUsd: roundCents(rec.highUsd) };
  }
  return rec.pointUsd != null ? { usd: roundCents(rec.pointUsd), highUsd: null } : null;
}

export const adminKeys = {
  all: ['hermes-admin'] as const,
  lists: ['hermes-admin', 'list'] as const,
  list: (bucket: string) => ['hermes-admin', 'list', bucket] as const,
  detail: (id: string) => ['hermes-admin', 'auction', id] as const,
};
