import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { LineChart, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { marketHeatAPI } from '@/integrations/api/client';
import type { ApiMarketForecast } from '@/types/analytics-api';

const SCOPES = [
  { k: 'segment', label: 'Markets' },
  { k: 'set', label: 'Sets' },
  { k: 'player', label: 'Players' },
  { k: 'card', label: 'Cards' },
  { k: 'all', label: 'All' },
] as const;

const CONF: Record<string, { label: string; color: string }> = {
  high: { label: 'high conf', color: '#B4FF39' },
  medium: { label: 'med conf', color: '#fbbf24' },
  low: { label: 'low conf', color: '#9ca3af' },
  insufficient: { label: 'need data', color: '#6b7280' },
};

const dirIcon = (d: string) => (d === 'rising' ? TrendingUp : d === 'cooling' ? TrendingDown : Minus);
const dirColor = (d: string) => (d === 'rising' ? '#B4FF39' : d === 'cooling' ? '#f87171' : '#9ca3af');

/**
 * Momentum forecast — a simple trend projection of each market's heat 7 days
 * out. Deliberately honest: markets with too few snapshots show "gathering
 * data", and confidence is surfaced. Sharpens as daily snapshots accrue.
 */
export const MarketForecastPanel = () => {
  const [scope, setScope] = useState<string>('segment');
  const [rows, setRows] = useState<ApiMarketForecast[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await marketHeatAPI.forecast(scope));
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const updated = rows[0]?.asOf ?? null;
  const horizon = rows[0]?.horizonDays ?? 7;
  const ready = rows.filter(r => r.projectedHeat != null);

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-sm font-medium text-white">{horizon}-day heat outlook</span>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            trend projection — sharpens as daily snapshots accrue
          </span>
        </div>
        {updated && (
          <span className="text-[11px] text-muted-foreground">as of {moment(updated).fromNow()}</span>
        )}
      </div>

      {/* Scope tabs */}
      <div className="mb-4 inline-flex rounded-md border border-white/10 bg-black/40 p-0.5">
        {SCOPES.map(s => (
          <button
            key={s.k}
            type="button"
            onClick={() => setScope(s.k)}
            className={`h-8 rounded px-3 text-xs transition-colors ${
              scope === s.k ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading forecast…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No forecast yet — needs a few daily snapshots to project a trend.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => {
            const Dir = dirIcon(r.direction);
            const c = dirColor(r.direction);
            const conf = CONF[r.confidence] ?? CONF.low;
            const projected = r.projectedHeat != null;
            return (
              <div
                key={r.segment}
                className="flex items-center gap-3 rounded-lg border border-white/8 bg-black/20 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">
                      {r.label ?? r.segment}
                    </span>
                    {r.rootMarket && r.scope !== 'segment' && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/40">
                        {r.rootMarket.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {projected ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white/45">{r.currentHeat ?? '—'}</span>
                      <Dir className="h-4 w-4" style={{ color: c }} />
                      <span className="text-lg font-bold leading-none" style={{ color: c }}>
                        {r.projectedHeat}
                      </span>
                      {r.heatDelta != null && r.heatDelta !== 0 && (
                        <span className="text-[11px]" style={{ color: c }}>
                          {r.heatDelta > 0 ? '+' : ''}
                          {r.heatDelta}
                        </span>
                      )}
                    </div>
                    <div className="flex w-28 shrink-0 flex-col items-end gap-0.5">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px]"
                        style={{ color: conf.color, background: `${conf.color}1a` }}
                      >
                        {conf.label}
                      </span>
                      {r.askChangePct != null && (
                        <span className="text-[10px] text-muted-foreground">
                          ask {r.askChangePct >= 0 ? '+' : ''}
                          {r.askChangePct}%
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-[11px] text-white/40">
                    gathering data ({r.points} snapshot{r.points === 1 ? '' : 's'})
                  </span>
                )}
              </div>
            );
          })}
          <p className="pt-1 text-[11px] text-muted-foreground/70">
            Early trend projection (least-squares on recent snapshots). {ready.length} of{' '}
            {rows.length} markets have enough history to project; the rest fill in as daily
            snapshots accrue. Confidence reflects fit quality + sample size.
          </p>
        </div>
      )}
    </Card>
  );
};
