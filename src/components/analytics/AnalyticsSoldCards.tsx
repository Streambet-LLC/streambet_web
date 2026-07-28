import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiSoldCard,
  ApiSoldSummary,
  ApiTrackedCard,
} from '@/types/analytics-api';
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  BadgeDollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (n: number | null | undefined) =>
  n == null ? '' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const gainColor = (n: number) =>
  n > 0 ? '#B4FF39' : n < 0 ? '#f87171' : '#9ca3af';

/** '' → null so a cleared field means "unknown", not 0. */
const num = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
};

const MANUAL = '__manual__';

/**
 * Sold Cards — the realized side of the portfolio. Holdings above track what
 * you're up on paper; this tracks what you actually banked, net of fees. Sales
 * can be logged from scratch or by selling a watched card, which draws that
 * holding down (and removes it once the last copy is gone).
 */
export const AnalyticsSoldCards = ({
  refreshSignal,
  onChange,
}: {
  /** Bump to refetch. */
  refreshSignal?: number;
  /** Fired after a sale is logged/edited/deleted so holdings can refresh. */
  onChange?: () => void;
}) => {
  const [summary, setSummary] = useState<ApiSoldSummary | null>(null);
  const [watchlist, setWatchlist] = useState<ApiTrackedCard[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add-sale form
  const [source, setSource] = useState<string>(MANUAL);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [platform, setPlatform] = useState('');
  const [soldAt, setSoldAt] = useState(() => moment().format('YYYY-MM-DD'));
  const [reduceHolding, setReduceHolding] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const [sold, cards] = await Promise.all([
        analyticsAPI.getSoldCards({ search: debounced || undefined, limit }),
        analyticsAPI.getMarketCards({ limit: 200 }).catch(() => ({ data: [] })),
      ]);
      setSummary(sold);
      setWatchlist(cards.data);
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [debounced, limit]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const picked = useMemo(
    () => (source === MANUAL ? null : watchlist.find(c => c.id === source)),
    [source, watchlist]
  );

  /** Selecting a watched card prefills its name + what you paid for it. */
  const pickSource = (id: string) => {
    setSource(id);
    const card = id === MANUAL ? null : watchlist.find(c => c.id === id);
    if (card) {
      setName(card.name);
      if (card.costBasisUsd != null) setCost(String(card.costBasisUsd));
    } else {
      setName('');
    }
  };

  const resetForm = () => {
    setSource(MANUAL);
    setName('');
    setQty('1');
    setCost('');
    setPrice('');
    setFees('');
    setPlatform('');
    setSoldAt(moment().format('YYYY-MM-DD'));
    setReduceHolding(true);
  };

  const logSale = async () => {
    const n = name.trim();
    if (!n || saving) return;
    setSaving(true);
    try {
      const q = Number.parseInt(qty, 10);
      await analyticsAPI.addSoldCard({
        name: n,
        quantity: Number.isFinite(q) && q > 0 ? q : 1,
        costBasisUsd: num(cost),
        salePriceUsd: num(price),
        feesUsd: num(fees),
        platform: platform.trim() || undefined,
        soldAt: soldAt ? new Date(soldAt).toISOString() : null,
        trackedCardId: picked?.id ?? null,
        reduceHolding: picked ? reduceHolding : undefined,
      });
      toast.success(`Logged sale of “${n}”`);
      resetForm();
      await load();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not log that sale.');
    } finally {
      setSaving(false);
    }
  };

  const patchSale = async (
    id: string,
    body: Parameters<typeof analyticsAPI.updateSoldCard>[1]
  ) => {
    try {
      await analyticsAPI.updateSoldCard(id, body);
      await load();
      onChange?.();
    } catch {
      toast.error('Could not update that sale.');
    }
  };

  const removeSale = async (sale: ApiSoldCard) => {
    try {
      await analyticsAPI.removeSoldCard(sale.id);
      toast.success(`Removed “${sale.name}”`);
      await load();
      onChange?.();
    } catch {
      toast.error('Could not delete that sale.');
    }
  };

  const sales = summary?.sales ?? [];
  const realized = summary?.realizedGainUsd ?? 0;

  return (
    <div className="space-y-5">
      {/* Realized roll-up + sales ledger */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4 text-[#B4FF39]" />
            <span className="text-xs font-medium uppercase tracking-wide text-white/80">
              Sold Cards
            </span>
            {summary && summary.total > 0 && (
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-muted-foreground">
                {summary.total}
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sold cards…"
              className="pl-9 bg-black/40 border-white/10"
            />
          </div>
        </div>

        {loading && !summary ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sales…
          </div>
        ) : sales.length === 0 ? (
          <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-6 text-center text-sm text-muted-foreground">
            {debounced
              ? 'No sales match that search.'
              : 'No sales logged yet — record one below to start tracking realized profit and loss.'}
          </div>
        ) : (
          <>
            {/* Realized tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile
                label="Net proceeds"
                value={money(summary?.netProceedsUsd)}
                sub={
                  summary?.totalFeesUsd
                    ? `${money(summary.totalProceedsUsd)} gross · ${money(summary.totalFeesUsd)} fees`
                    : undefined
                }
              />
              <Tile label="Cost basis" value={money(summary?.totalCostUsd)} />
              <Tile
                label="Realized P/L"
                value={money(realized)}
                sub={
                  summary?.realizedGainPct != null
                    ? pct(summary.realizedGainPct)
                    : undefined
                }
                color={gainColor(realized)}
              />
              <Tile
                label="Cards sold"
                value={String(summary?.cardsSold ?? 0)}
                sub={`${summary?.saleCount ?? 0} sale${summary?.saleCount === 1 ? '' : 's'}${
                  summary?.uncostedCount
                    ? ` · ${summary.uncostedCount} uncosted`
                    : ''
                }`}
              />
            </div>

            {/* Best / worst flip */}
            {(summary?.bestFlip || summary?.worstFlip) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {summary?.bestFlip && (
                  <Flip flip={summary.bestFlip} direction="up" />
                )}
                {summary?.worstFlip &&
                  summary.worstFlip.id !== summary.bestFlip?.id && (
                    <Flip flip={summary.worstFlip} direction="down" />
                  )}
              </div>
            )}

            {/* Sales ledger */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Card</th>
                    <th className="py-2 px-2 font-medium">Qty</th>
                    <th className="py-2 px-2 font-medium">Cost / ea</th>
                    <th className="py-2 px-2 font-medium">Sold / ea</th>
                    <th className="py-2 px-2 font-medium">Fees</th>
                    <th className="py-2 px-2 font-medium">Net</th>
                    <th className="py-2 px-2 font-medium">Realized P/L</th>
                    <th className="py-2 pl-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <SaleRow
                      key={s.id}
                      sale={s}
                      onPatch={body => patchSale(s.id, body)}
                      onRemove={() => removeSale(s)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {summary && summary.total > sales.length && (
              <button
                type="button"
                onClick={() => setLimit(l => l + 50)}
                className="mt-2 w-full rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-center text-xs text-muted-foreground hover:bg-white/5 hover:text-white"
              >
                Load more ({summary.total - sales.length})
              </button>
            )}

            <p className="mt-2 text-[11px] text-muted-foreground">
              Realized P/L is net of fees. Sales without a cost basis are
              excluded from gain/loss but still count toward proceeds.
            </p>
          </>
        )}
      </Card>

      {/* Log a sale */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="text-sm font-medium text-white mb-1">Log a sale</div>
        <p className="text-xs text-muted-foreground mb-3">
          Record a card you've sold to track realized profit and loss. Pick one
          from your watchlist to carry over what you paid, or enter it manually.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Select value={source} onValueChange={pickSource}>
              <SelectTrigger className="w-full sm:w-[220px] bg-black/40 border-white/10">
                <SelectValue placeholder="From watchlist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL}>Manual entry</SelectItem>
                {watchlist.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.grade ? ` · ${c.grade}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logSale()}
              placeholder='Card name — e.g. "Mahomes 2019 Color Blast PSA 10"'
              className="flex-1 min-w-[240px] bg-black/40 border-white/10"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Field label="Qty" className="sm:w-[70px]">
              <Input
                value={qty}
                onChange={e => setQty(e.target.value)}
                inputMode="numeric"
                className="bg-black/40 border-white/10"
              />
            </Field>
            <MoneyField label="Cost / ea" value={cost} onChange={setCost} />
            <MoneyField label="Sold / ea" value={price} onChange={setPrice} />
            <MoneyField label="Fees (total)" value={fees} onChange={setFees} />
            <Field label="Platform" className="sm:w-[130px]">
              <Input
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                placeholder="eBay"
                className="bg-black/40 border-white/10"
              />
            </Field>
            <Field label="Sold on" className="sm:w-[150px]">
              <Input
                type="date"
                value={soldAt}
                onChange={e => setSoldAt(e.target.value)}
                className="bg-black/40 border-white/10"
              />
            </Field>
            <div className="flex items-end">
              <Button
                onClick={logSale}
                disabled={!name.trim() || saving}
                className="w-full bg-[#B4FF39] text-black hover:bg-[#a2e833] disabled:opacity-40 sm:w-auto"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" /> Log sale
                  </>
                )}
              </Button>
            </div>
          </div>

          {picked && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={reduceHolding}
                onCheckedChange={v => setReduceHolding(v === true)}
                className="border-white/20 data-[state=checked]:bg-[#B4FF39] data-[state=checked]:text-black"
              />
              Remove the sold copies from my holdings
            </label>
          )}
        </div>
      </Card>
    </div>
  );
};

const Field = ({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`flex w-full flex-col gap-1 ${className ?? ''}`}>
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    {children}
  </div>
);

const MoneyField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <Field label={label} className="sm:w-[110px]">
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        $
      </span>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="decimal"
        placeholder="—"
        className="bg-black/40 border-white/10 pl-5"
      />
    </div>
  </Field>
);

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

const Flip = ({
  flip,
  direction,
}: {
  flip: { id: string; name: string; realizedGainUsd: number };
  direction: 'up' | 'down';
}) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/75">
    {direction === 'up' ? (
      <TrendingUp className="h-3 w-3 text-[#B4FF39]" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-400" />
    )}
    {/* Pills can't wrap without breaking the row — full name in the tooltip. */}
    <span className="max-w-[160px] truncate" title={flip.name}>
      {flip.name}
    </span>
    <span style={{ color: gainColor(flip.realizedGainUsd) }}>
      {flip.realizedGainUsd >= 0 ? '+' : ''}
      {money(flip.realizedGainUsd)}
    </span>
  </span>
);

/** One logged sale — the money fields stay editable so typos are cheap to fix. */
const SaleRow = ({
  sale,
  onPatch,
  onRemove,
}: {
  sale: ApiSoldCard;
  onPatch: (body: {
    quantity?: number;
    costBasisUsd?: number | null;
    salePriceUsd?: number | null;
    feesUsd?: number | null;
  }) => void;
  onRemove: () => void;
}) => {
  const [qty, setQty] = useState(String(sale.quantity ?? 1));
  const [cost, setCost] = useState(
    sale.costBasisUsd != null ? String(sale.costBasisUsd) : ''
  );
  const [price, setPrice] = useState(
    sale.salePriceUsd != null ? String(sale.salePriceUsd) : ''
  );
  const [fees, setFees] = useState(
    sale.feesUsd != null ? String(sale.feesUsd) : ''
  );

  const gain = sale.realizedGainUsd;

  return (
    <tr className="border-b border-white/5">
      <td className="py-2 pr-2">
        {/* Wrap rather than truncate — see the holdings table; a clipped name
            hides the parallel/number that tells two sales apart. */}
        <div className="flex items-start gap-2">
          <span className="min-w-[180px] max-w-[320px] break-words text-white/90">
            {sale.name}
          </span>
          {sale.grade && (
            <Badge
              variant="outline"
              className="shrink-0 border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[10px] text-[#B4FF39]"
            >
              {sale.grade}
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {[
            sale.platform,
            sale.soldAt ? moment(sale.soldAt).format('MMM D, YYYY') : null,
          ]
            .filter(Boolean)
            .join(' · ') || '—'}
        </div>
      </td>
      <td className="py-2 px-2">
        <Input
          value={qty}
          onChange={e => setQty(e.target.value)}
          onBlur={() => {
            const q = Number.parseInt(qty, 10);
            if (Number.isFinite(q) && q !== sale.quantity)
              onPatch({ quantity: q });
          }}
          className="h-8 w-14 border-white/10 bg-black/40 text-sm"
        />
      </td>
      <td className="py-2 px-2">
        <MoneyCell
          value={cost}
          onChange={setCost}
          onCommit={() => {
            const c = num(cost);
            if (c !== sale.costBasisUsd) onPatch({ costBasisUsd: c });
          }}
        />
      </td>
      <td className="py-2 px-2">
        <MoneyCell
          value={price}
          onChange={setPrice}
          onCommit={() => {
            const p = num(price);
            if (p !== sale.salePriceUsd) onPatch({ salePriceUsd: p });
          }}
        />
      </td>
      <td className="py-2 px-2">
        <MoneyCell
          value={fees}
          onChange={setFees}
          onCommit={() => {
            const f = num(fees);
            if (f !== sale.feesUsd) onPatch({ feesUsd: f });
          }}
        />
      </td>
      <td className="py-2 px-2">
        {sale.netProceedsUsd != null ? (
          <span className="font-semibold text-white">
            {money(sale.netProceedsUsd)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 px-2">
        {gain != null ? (
          <span className="font-medium" style={{ color: gainColor(gain) }}>
            {money(gain)}
            {sale.realizedGainPct != null && (
              <span className="ml-1 text-[11px]">
                {pct(sale.realizedGainPct)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 pl-2 text-right">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-red-400"
          aria-label="Delete sale"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};

const MoneyCell = ({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
}) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      $
    </span>
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit}
      inputMode="decimal"
      placeholder="—"
      className="h-8 w-24 border-white/10 bg-black/40 pl-5 text-sm"
    />
  </div>
);
