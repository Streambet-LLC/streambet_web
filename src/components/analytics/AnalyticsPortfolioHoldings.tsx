import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiPortfolioSummary,
  ApiPortfolioAlert,
  ApiTrackedCard,
} from '@/types/analytics-api';

const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (n: number | null | undefined) =>
  n == null ? '' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const gainColor = (n: number) => (n > 0 ? '#B4FF39' : n < 0 ? '#f87171' : '#9ca3af');

/**
 * Portfolio holdings — the money view of your tracked cards. Records cost basis
 * + quantity, values every card via the code-computed valuation engine, and
 * rolls it up into total value, gain/loss, and movers.
 */
export const AnalyticsPortfolioHoldings = ({
  refreshSignal,
}: {
  /** Bump to refetch (e.g. after a card is added/removed elsewhere). */
  refreshSignal?: number;
}) => {
  const [pf, setPf] = useState<ApiPortfolioSummary | null>(null);
  const [alerts, setAlerts] = useState<ApiPortfolioAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [valuing, setValuing] = useState(false);
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const [portfolio, alertList] = await Promise.all([
        analyticsAPI.getPortfolio(),
        analyticsAPI.getPortfolioAlerts().catch(() => []),
      ]);
      setPf(portfolio);
      setAlerts(alertList);
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const valueAll = async () => {
    if (valuing) return;
    setValuing(true);
    try {
      await analyticsAPI.valuePortfolio();
      await load();
      toast.success('Portfolio valued');
    } catch (e) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not value the portfolio.'
      );
    } finally {
      setValuing(false);
    }
  };

  const valueOne = async (id: string) => {
    setRowBusy(b => ({ ...b, [id]: true }));
    try {
      await analyticsAPI.valueTrackedCard(id);
      await load();
    } catch {
      toast.error('Could not value that card.');
    } finally {
      setRowBusy(b => ({ ...b, [id]: false }));
    }
  };

  const patchHolding = async (
    id: string,
    body: {
      quantity?: number;
      costBasisUsd?: number | null;
      alertAboveUsd?: number | null;
    }
  ) => {
    try {
      await analyticsAPI.updateHolding(id, body);
      await load();
    } catch {
      toast.error('Could not update that holding.');
    }
  };

  if (loading) {
    return (
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading portfolio…
      </Card>
    );
  }

  const cards = pf?.cards ?? [];
  const hasCards = cards.length > 0;
  const gain = pf?.gainUsd ?? 0;

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
      {/* Header + refresh */}
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-[#B4FF39]" />
        <span className="text-xs font-medium uppercase tracking-wide text-white/80">
          My Holdings
        </span>
        <Button
          size="sm"
          onClick={valueAll}
          disabled={valuing || !hasCards}
          className="ml-auto h-8 gap-1.5 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90 disabled:opacity-40"
        >
          {valuing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Valuing {cards.length}…
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Value portfolio
            </>
          )}
        </Button>
      </div>

      {!hasCards ? (
        <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Watch cards below (or ask Cardy to log them), add what you paid, then
          hit <span className="text-white/80">Value portfolio</span> to see live
          value and gain/loss.
        </div>
      ) : (
        <>
          {/* Alerts — the "what moved / hit your target" banner */}
          {alerts.length > 0 && (
            <div className="mb-3 space-y-1.5 rounded-lg border border-[#B4FF39]/25 bg-[#B4FF39]/[0.06] p-2.5">
              {alerts.slice(0, 5).map((a, i) => (
                <div key={`${a.id}-${i}`} className="flex items-center gap-2 text-xs">
                  <Bell className="h-3.5 w-3.5 shrink-0 text-[#B4FF39]" />
                  {a.direction === 'up' ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[#B4FF39]" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  )}
                  <span className="min-w-0">
                    <span className="font-medium text-white">{a.name}</span>{' '}
                    <span className="text-white/70">{a.message}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Total value" value={money(pf?.totalValueUsd)} />
            <Tile label="Cost basis" value={money(pf?.totalCostUsd)} />
            <Tile
              label="Gain / loss"
              value={money(gain)}
              sub={pf?.gainPct != null ? pct(pf.gainPct) : undefined}
              color={gainColor(gain)}
            />
            <Tile
              label="Holdings"
              value={String(pf?.cardCount ?? 0)}
              sub={`${pf?.valuedCount ?? 0} valued · ${pf?.costedCount ?? 0} costed`}
            />
          </div>

          {/* Movers */}
          {pf && pf.movers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pf.movers.map(m => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/75"
                >
                  {m.changePct >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-[#B4FF39]" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <span className="max-w-[160px] truncate">{m.name}</span>
                  <span style={{ color: gainColor(m.changePct) }}>{pct(m.changePct)}</span>
                </span>
              ))}
            </div>
          )}

          {/* Holdings table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Card</th>
                  <th className="py-2 px-2 font-medium">Qty</th>
                  <th className="py-2 px-2 font-medium">Cost / ea</th>
                  <th className="py-2 px-2 font-medium">Value / ea</th>
                  <th className="py-2 px-2 font-medium">Gain / loss</th>
                  <th className="py-2 px-2 font-medium">Alert &gt;</th>
                  <th className="py-2 pl-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {cards.map(c => (
                  <HoldingRow
                    key={c.id}
                    card={c}
                    busy={!!rowBusy[c.id]}
                    onValue={() => valueOne(c.id)}
                    onPatch={body => patchHolding(c.id, body)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Values are code-computed from live comps — a market estimate, not
            financial advice.
          </p>
        </>
      )}
    </Card>
  );
};

const Tile = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) => (
  <div className="rounded-lg border border-white/8 bg-black/20 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="text-lg font-bold" style={color ? { color } : undefined}>
      {value}
    </div>
    {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
  </div>
);

const HoldingRow = ({
  card,
  busy,
  onValue,
  onPatch,
}: {
  card: ApiTrackedCard;
  busy: boolean;
  onValue: () => void;
  onPatch: (body: {
    quantity?: number;
    costBasisUsd?: number | null;
    alertAboveUsd?: number | null;
  }) => void;
}) => {
  const [qty, setQty] = useState(String(card.quantity ?? 1));
  const [cost, setCost] = useState(
    card.costBasisUsd != null ? String(card.costBasisUsd) : ''
  );
  const [alertAbove, setAlertAbove] = useState(
    card.alertAboveUsd != null ? String(card.alertAboveUsd) : ''
  );

  const value = card.lastValueUsd;
  const gainEa =
    value != null && card.costBasisUsd != null ? value - card.costBasisUsd : null;
  const gainPctEa =
    gainEa != null && card.costBasisUsd
      ? (gainEa / card.costBasisUsd) * 100
      : null;

  return (
    <tr className="border-b border-white/5">
      <td className="py-2 pr-2">
        <div className="max-w-[220px] truncate text-white/90">{card.name}</div>
        {card.grade && (
          <div className="text-[11px] text-muted-foreground">{card.grade}</div>
        )}
      </td>
      <td className="py-2 px-2">
        <Input
          value={qty}
          onChange={e => setQty(e.target.value)}
          onBlur={() => {
            const q = parseInt(qty, 10);
            if (Number.isFinite(q) && q !== card.quantity)
              onPatch({ quantity: q });
          }}
          className="h-8 w-14 border-white/10 bg-black/40 text-sm"
        />
      </td>
      <td className="py-2 px-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            $
          </span>
          <Input
            value={cost}
            onChange={e => setCost(e.target.value)}
            onBlur={() => {
              const raw = cost.trim();
              const c = raw === '' ? null : parseFloat(raw);
              if (c !== card.costBasisUsd)
                onPatch({ costBasisUsd: c == null || Number.isNaN(c) ? null : c });
            }}
            placeholder="—"
            className="h-8 w-24 border-white/10 bg-black/40 pl-5 text-sm"
          />
        </div>
      </td>
      <td className="py-2 px-2">
        {value != null ? (
          <div>
            <span className="font-semibold text-white">{money(value)}</span>
            {card.lastConfidencePct != null && (
              <span className="ml-1 text-[11px] text-muted-foreground">
                {card.lastConfidencePct}%
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 px-2">
        {gainEa != null ? (
          <span
            className="font-medium"
            style={{ color: gainColor(gainEa * (card.quantity ?? 1)) }}
          >
            {money(gainEa * (card.quantity ?? 1))}
            {gainPctEa != null && (
              <span className="ml-1 text-[11px]">{pct(gainPctEa)}</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 px-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            $
          </span>
          <Input
            value={alertAbove}
            onChange={e => setAlertAbove(e.target.value)}
            onBlur={() => {
              const raw = alertAbove.trim();
              const a = raw === '' ? null : parseFloat(raw);
              if (a !== card.alertAboveUsd)
                onPatch({
                  alertAboveUsd: a == null || Number.isNaN(a) ? null : a,
                });
            }}
            placeholder="—"
            className="h-8 w-24 border-white/10 bg-black/40 pl-5 text-sm"
          />
        </div>
      </td>
      <td className="py-2 pl-2 text-right">
        <Button
          size="sm"
          variant="ghost"
          onClick={onValue}
          disabled={busy}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-white"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Value
        </Button>
      </td>
    </tr>
  );
};
