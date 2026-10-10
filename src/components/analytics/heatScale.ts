import moment from 'moment';
import type { ApiMarketHeatScale } from '@/types/analytics-api';

// Mirrors toHeatIndex / toHeatIndexDelta in the API's market-heat.service.ts.

/** Raw heat → 0-100 index on the site-wide record scale. Passes raw through with no scale. */
export const toHeatIndex = (
  raw: number | null | undefined,
  s: ApiMarketHeatScale | null,
): number | null => {
  if (raw == null) return null;
  if (!s) return raw;
  const v = ((raw - s.floor) / (s.ceiling - s.floor)) * 100;
  return Math.round(Math.max(0, Math.min(100, v)));
};

/** Raw heat change → change in index points on the record scale. */
export const toHeatIndexDelta = (
  delta: number | null | undefined,
  s: ApiMarketHeatScale | null,
): number | null => {
  if (delta == null) return null;
  if (!s) return delta;
  return Math.round((delta / (s.ceiling - s.floor)) * 100);
};

/** "Sports on Sep 14" — who set the all-time record, and when. */
export const recordHolder = (s: ApiMarketHeatScale) =>
  `${s.high.label ?? s.high.segment} on ${moment(s.high.capturedAt).format('MMM D')}`;
