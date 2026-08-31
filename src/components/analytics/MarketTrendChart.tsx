import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { marketHeatAPI, marketEngagementAPI } from '@/integrations/api/client';
import type { ApiMarketHeatPoint, ApiMarketEngagementPoint } from '@/types/analytics-api';

const compact = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const RANGES = [
  { d: 30, l: '30d' },
  { d: 60, l: '60d' },
  { d: 90, l: '90d' },
] as const;

type MetricKey = 'heat' | 'price' | 'supply' | 'attention';
interface MetricDef {
  k: MetricKey;
  label: string;
  keys: { dk: string; name: string; color: string }[];
  domain?: [number, number];
  fmt: (n: number) => string;
}

const METRICS: MetricDef[] = [
  { k: 'heat', label: 'Heat', keys: [{ dk: 'heat', name: 'Heat', color: '#B4FF39' }], domain: [0, 100], fmt: n => String(Math.round(n)) },
  { k: 'price', label: 'Median ask', keys: [{ dk: 'price', name: 'Median ask', color: '#fbbf24' }], fmt: n => `$${compact(n)}` },
  { k: 'supply', label: 'Supply', keys: [{ dk: 'supply', name: 'Active listings', color: '#60a5fa' }], fmt: n => compact(n) },
  {
    k: 'attention',
    label: 'Views / saves',
    keys: [
      { dk: 'views', name: 'Views', color: '#B4FF39' },
      { dk: 'saves', name: 'Saves', color: '#f472b6' },
    ],
    fmt: n => compact(n),
  },
];

/**
 * Time-series trend for one market topic — peaks and troughs over the recent
 * snapshots. A metric toggle (heat / median ask / supply / first-party
 * attention) drives a single readable line chart on a dark theme.
 */
export const MarketTrendChart = ({ segment, label }: { segment: string; label: string | null }) => {
  const [days, setDays] = useState<number>(90);
  const [metric, setMetric] = useState<MetricKey>('heat');
  const [heat, setHeat] = useState<ApiMarketHeatPoint[]>([]);
  const [eng, setEng] = useState<ApiMarketEngagementPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, e] = await Promise.all([
        marketHeatAPI.series(segment, days),
        marketEngagementAPI.series(segment, days).catch(() => []),
      ]);
      setHeat(h);
      setEng(e as ApiMarketEngagementPoint[]);
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [segment, days]);

  useEffect(() => {
    load();
  }, [load]);

  const hasEng = eng.some(p => (p.totalViews ?? 0) > 0 || (p.totalWatchers ?? 0) > 0);
  const metrics = METRICS.filter(m => m.k !== 'attention' || hasEng);
  const active = metrics.find(m => m.k === metric) ?? metrics[0];

  const data = useMemo(() => {
    const byDate = new Map<string, Record<string, unknown>>();
    const put = (d: string, patch: Record<string, unknown>) =>
      byDate.set(d, { ...(byDate.get(d) ?? { date: d }), ...patch });
    for (const p of heat) {
      put(moment(p.capturedAt).format('YYYY-MM-DD'), {
        heat: p.heatScore,
        price: p.medianAskUsd,
        supply: p.totalActive,
      });
    }
    for (const p of eng) {
      put(moment(p.capturedAt).format('YYYY-MM-DD'), {
        views: p.totalViews,
        saves: p.totalWatchers,
      });
    }
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [heat, eng]);

  // Peaks & troughs on the primary series of the active metric.
  const stats = useMemo(() => {
    const dk = active.keys[0].dk;
    const vals = data.map(d => d[dk]).filter((v): v is number => typeof v === 'number');
    if (!vals.length) return null;
    return { now: vals[vals.length - 1], low: Math.min(...vals), high: Math.max(...vals), points: vals.length };
  }, [data, active]);

  return (
    <div className="mt-3 rounded-lg border border-white/8 bg-black/30 p-3">
      {/* Controls */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-white/10 bg-black/40 p-0.5">
          {metrics.map(m => (
            <button
              key={m.k}
              type="button"
              onClick={() => setMetric(m.k)}
              className={`h-7 rounded px-2.5 text-[11px] transition-colors ${
                active.k === m.k ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-white/10 bg-black/40 p-0.5">
          {RANGES.map(r => (
            <button
              key={r.d}
              type="button"
              onClick={() => setDays(r.d)}
              className={`h-7 rounded px-2 text-[11px] transition-colors ${
                days === r.d ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
              }`}
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {/* Peaks & troughs caption */}
      {stats && (
        <div className="mb-1 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
          <span>now <span className="text-white">{active.fmt(stats.now)}</span></span>
          <span>low <span className="text-red-300">{active.fmt(stats.low)}</span></span>
          <span>high <span className="text-[#B4FF39]">{active.fmt(stats.high)}</span></span>
        </div>
      )}

      {loading && data.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trend…
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
          No snapshots yet for {label ?? segment}.
        </div>
      ) : data.length < 2 ? (
        <div className="flex h-[180px] items-center justify-center px-6 text-center text-xs text-muted-foreground">
          Only one snapshot so far — the trend line appears once the next daily snapshot lands.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={d => moment(d).format('MMM D')}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              stroke="rgba(255,255,255,0.1)"
              minTickGap={24}
            />
            <YAxis
              domain={active.domain ?? ['auto', 'auto']}
              tickFormatter={v => active.fmt(v as number)}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              stroke="rgba(255,255,255,0.1)"
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
                color: '#fff',
              }}
              labelFormatter={d => moment(d as string).format('MMM D, YYYY')}
              formatter={(value: number, name: string) => [active.fmt(value), name]}
            />
            {active.keys.map(k => (
              <Line
                key={k.dk}
                type="monotone"
                dataKey={k.dk}
                name={k.name}
                stroke={k.color}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
