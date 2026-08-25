import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Flame,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Tag,
} from 'lucide-react';
import { marketHeatAPI } from '@/integrations/api/client';
import type { ApiMarketHeatPoint, ApiMarketHeatMover } from '@/types/analytics-api';

const SCOPES = [
  { k: 'segment', label: 'Markets' },
  { k: 'set', label: 'Sets' },
  { k: 'card', label: 'Cards' },
  { k: 'all', label: 'All' },
] as const;

const heatColor = (n: number | null) =>
  n == null ? '#6b7280' : n >= 70 ? '#B4FF39' : n >= 45 ? '#fbbf24' : '#f87171';
const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString()}`;
const pct = (n: number | null | undefined) =>
  n == null ? null : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

/** A small momentum chip. `invert` flips color meaning (rising supply = cooling). */
const Momentum = ({
  label,
  value,
  invert,
}: {
  label: string;
  value: number | null | undefined;
  invert?: boolean;
}) => {
  if (value == null)
    return (
      <span className="text-[11px] text-muted-foreground">
        {label} <span className="text-white/40">—</span>
      </span>
    );
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.5;
  const color = flat ? '#9ca3af' : good ? '#B4FF39' : '#f87171';
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <Icon className="h-3 w-3" style={{ color }} />
      <span style={{ color }}>{pct(value)}</span>
    </span>
  );
};

/**
 * Real-time market heat — leading indicators from daily active-listing
 * snapshots (supply level + supply/price momentum), ahead of sold comps.
 */
export const MarketHeatPanel = () => {
  const [scope, setScope] = useState<string>('segment');
  const [rows, setRows] = useState<ApiMarketHeatPoint[]>([]);
  const [movers, setMovers] = useState<ApiMarketHeatMover[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, m] = await Promise.all([
        marketHeatAPI.latest(scope),
        marketHeatAPI.movers(scope, 6),
      ]);
      setRows(
        [...l].sort((a, b) => (b.heatScore ?? -1) - (a.heatScore ?? -1))
      );
      setMovers(m);
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const collect = async () => {
    if (collecting) return;
    setCollecting(true);
    try {
      await marketHeatAPI.collect();
      await load();
    } catch {
      /* ignore */
    } finally {
      setCollecting(false);
    }
  };

  const updated = rows[0]?.capturedAt ?? null;

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-sm font-medium text-white">Live market heat</span>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            leading indicators from active listings — ahead of sold comps
          </span>
        </div>
        <div className="flex items-center gap-2">
          {updated && (
            <span className="text-[11px] text-muted-foreground">
              {moment(updated).fromNow()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={collect}
            disabled={collecting}
            className="h-8 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5 hover:text-white"
          >
            {collecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Snapshot now
          </Button>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="mb-4 inline-flex rounded-md border border-white/10 bg-black/40 p-0.5">
        {SCOPES.map(s => (
          <button
            key={s.k}
            type="button"
            onClick={() => setScope(s.k)}
            className={`h-8 rounded px-3 text-xs transition-colors ${
              scope === s.k
                ? 'bg-white/10 text-white'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Movers strip */}
      {movers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {movers.map(m => {
            const up = (m.heatChange ?? 0) >= 0;
            return (
              <span
                key={m.segment}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                  up
                    ? 'border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[#B4FF39]'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {m.label ?? m.segment}
                <span className="font-semibold">
                  {up ? '+' : ''}
                  {m.heatChange}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Leaderboard */}
      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading heat…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No snapshots yet — hit "Snapshot now" to collect the first data point.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div
              key={r.segment}
              className="rounded-lg border border-white/8 bg-black/20 p-3"
            >
              <div className="flex items-center gap-3">
                {/* Heat score dial */}
                <div className="w-12 shrink-0 text-center">
                  <div
                    className="text-xl font-bold leading-none"
                    style={{ color: heatColor(r.heatScore) }}
                  >
                    {r.heatScore ?? '—'}
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    heat
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {r.scope === 'set' ? (
                      <Package className="h-3.5 w-3.5 text-white/40" />
                    ) : r.scope === 'card' ? (
                      <Tag className="h-3.5 w-3.5 text-white/40" />
                    ) : null}
                    <span className="truncate font-medium text-white">
                      {r.label ?? r.segment}
                    </span>
                  </div>
                  {/* Heat bar */}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(3, Math.min(100, r.heatScore ?? 0))}%`,
                        background: heatColor(r.heatScore),
                      }}
                    />
                  </div>
                  {/* Indicators */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11px] text-muted-foreground">
                      {(r.totalActive ?? 0).toLocaleString()} listed
                    </span>
                    <Momentum label="supply" value={r.totalActiveChangePct} invert />
                    <span className="text-[11px] text-muted-foreground">
                      ask {money(r.medianAskUsd)}
                    </span>
                    <Momentum label="" value={r.askChangePct} />
                    {r.medianDaysListed != null && (
                      <span className="text-[11px] text-muted-foreground">
                        {r.medianDaysListed.toFixed(0)}d listed
                      </span>
                    )}
                    {r.extra?.social?.mentions != null && (
                      <span className="text-[11px] text-muted-foreground">
                        buzz {r.extra.social.mentions}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-muted-foreground/70">
            Supply level + price/supply momentum are live signals; velocity/days-listed
            firm up as daily snapshots accrue.
          </p>
        </div>
      )}
    </Card>
  );
};
