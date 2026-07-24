import { useEffect, useState } from 'react';
import moment from 'moment';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, LineChart as LineIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatUsd } from '@/utils/format';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiCardMarketProfile,
  ApiCardMarketPoint,
} from '@/types/analytics-api';

// Fixed categorical color per source — assigned by identity, never cycled.
const SOURCE_COLORS: Record<string, string> = {
  web: '#B4FF39',
  ebay: '#38bdf8',
  tcgplayer: '#f59e0b',
  pricecharting: '#a78bfa',
  psa: '#f472b6',
};
const SOURCE_LABELS: Record<string, string> = {
  web: 'Web research',
  ebay: 'eBay',
  tcgplayer: 'TCGplayer',
  pricecharting: 'PriceCharting',
  psa: 'PSA',
};
const colorFor = (s: string) => SOURCE_COLORS[s] ?? '#94a3b8';
const labelFor = (s: string) => SOURCE_LABELS[s] ?? s;

type Row = { ts: number; label: string; volume: number } & Record<string, number>;

/** Pivot the flat snapshot history into one row per capture time. */
function buildRows(history: ApiCardMarketPoint[]): {
  rows: Row[];
  sources: string[];
} {
  const byTs = new Map<number, Row>();
  const sources = new Set<string>();
  for (const p of history) {
    const t = new Date(p.capturedAt).getTime();
    const row =
      byTs.get(t) ??
      ({ ts: t, label: moment(p.capturedAt).format('MMM D'), volume: 0 } as Row);
    if (p.medianUsd != null) {
      row[p.source] = p.medianUsd;
      sources.add(p.source);
    }
    if (p.sampleCount) row.volume += p.sampleCount;
    byTs.set(t, row);
  }
  const rows = [...byTs.values()].sort((a, b) => a.ts - b.ts);
  return { rows, sources: [...sources] };
}

const axisTick = { fill: 'rgba(255,255,255,0.45)', fontSize: 11 };

const MoneyTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[rgba(18,18,18,0.96)] px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 text-muted-foreground">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-white/80">{labelFor(p.name)}</span>
          <span className="ml-auto font-medium text-white">
            {formatUsd(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CountTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[rgba(18,18,18,0.96)] px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-white">{payload[0].value} comps</div>
    </div>
  );
};

export const CardMarketProfile = ({ cardId }: { cardId: string }) => {
  const [profile, setProfile] = useState<ApiCardMarketProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProfile(null);
    analyticsAPI
      .getCardProfile(cardId)
      .then(p => active && setProfile(p))
      .catch(() => active && setProfile(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [cardId]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const p = await analyticsAPI.refreshCardProfile(cardId);
      setProfile(p);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Refresh failed. Check the Anthropic key and try again.';
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  const header = (
    <div className="flex items-center gap-2">
      <LineIcon className="h-4 w-4 text-[#B4FF39]" />
      <span className="text-xs font-medium uppercase tracking-wide text-white/80">
        Market history
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        {header}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading market data…
        </div>
      </div>
    );
  }

  const history = profile?.history ?? [];
  const { rows, sources } = buildRows(history);
  const hasPrice = rows.some(r => sources.some(s => r[s] != null));
  const hasVolume = rows.some(r => r.volume > 0);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        {header}
        <Button
          size="sm"
          variant="ghost"
          onClick={refresh}
          disabled={refreshing}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          {refreshing ? 'Pulling…' : profile?.updatedAt ? 'Refresh' : 'Pull data'}
        </Button>
      </div>

      {/* Consensus + latest per source */}
      {profile && (profile.consensusMedianUsd != null || profile.latest.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {profile.consensusMedianUsd != null && (
            <div className="rounded-md border border-[#B4FF39]/20 bg-[#B4FF39]/[0.06] px-2.5 py-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Consensus
              </span>{' '}
              <span className="text-sm font-semibold text-white">
                {formatUsd(profile.consensusMedianUsd)}
              </span>
            </div>
          )}
          {profile.latest.map(l => {
            const estimated = l.meta?.estimated === true;
            const basis =
              typeof l.meta?.basis === 'string' ? l.meta.basis : undefined;
            return (
              <Badge
                key={l.source}
                variant="outline"
                title={
                  estimated
                    ? `Estimated (no direct comps) — ${basis ?? 'triangulated from comparable cards'}`
                    : basis
                }
                className="gap-1.5 border-white/10 bg-white/5 text-[11px] font-normal text-white/80"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colorFor(l.source) }}
                />
                {labelFor(l.source)}:{' '}
                {l.medianUsd != null ? formatUsd(l.medianUsd) : '—'}
                {estimated && (
                  <span className="ml-0.5 rounded bg-amber-400/15 px-1 text-[9px] font-medium uppercase tracking-wide text-amber-300">
                    est
                  </span>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!hasPrice && (
        <div className="rounded-md border border-white/5 bg-black/20 px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            No market data yet. Pull current pricing from eBay comps and live
            multi-site web research — each pull is saved so history builds over
            time.
          </p>
          <Button
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            className="mt-3 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pulling…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Pull market data
              </>
            )}
          </Button>
        </div>
      )}

      {/* Price over time */}
      {hasPrice && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Median price over time
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={rows}
              margin={{ top: 6, right: 8, bottom: 0, left: -8 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`}
              />
              <Tooltip
                content={<MoneyTooltip />}
                cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
              />
              {sources.length > 1 && (
                <Legend
                  formatter={(v: string) => (
                    <span className="text-xs text-white/70">{labelFor(v)}</span>
                  )}
                />
              )}
              {sources.map(s => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={colorFor(s)}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colorFor(s), strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comps volume over time */}
      {hasVolume && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Comps per pull
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart
              data={rows}
              margin={{ top: 2, right: 8, bottom: 0, left: -8 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={52}
                allowDecimals={false}
              />
              <Tooltip
                content={<CountTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar
                dataKey="volume"
                fill="#38bdf8"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cited sources from the latest web read */}
      {profile?.latest
        .filter(l => l.source === 'web')
        .flatMap(l => {
          const src = (l.meta?.sources ?? []) as { title: string; url: string }[];
          return Array.isArray(src) ? src : [];
        })
        .slice(0, 6)
        .map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mr-1.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 hover:border-white/20 hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
            {s.title || 'source'}
          </a>
        ))}

      <div className="text-[10px] text-muted-foreground">
        eBay comps + live multi-site web research. Prices are estimates, not
        financial advice.
      </div>
    </div>
  );
};
