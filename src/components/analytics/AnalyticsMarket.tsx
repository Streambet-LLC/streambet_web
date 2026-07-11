import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatUsd } from '@/mocks/analytics';
import { CardMarketProfile } from './CardMarketProfile';
import { ForecastBrief } from './ForecastBrief';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiMarketCard,
  ApiMarketCardDetail,
  ApiCardForecast,
} from '@/types/analytics-api';
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Radar,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

const LIQ_STYLES: Record<string, string> = {
  High: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Low: 'border-white/10 bg-white/5 text-white/60',
};

const VERDICT_STYLES: Record<string, string> = {
  Hold: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  'Sell now': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  'Sell soon': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

const brandLabel = (b: string | null) =>
  b === 'pokemon'
    ? 'Pokémon'
    : b === 'one_piece'
      ? 'One Piece'
      : b === 'sports'
        ? 'Sports'
        : b === 'other'
          ? 'Other'
          : b ?? '';

const pct = (n: number | null) => (n == null ? '—' : `${n}%`);

/**
 * Market (Dealer Suite) — per-card demand + pricing intelligence over our own
 * sales, eBay sold comps, and buyer analytics. Click a card for the full
 * breakdown + an AI Hold/Sell call.
 */
export const AnalyticsMarket = () => {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [brand, setBrand] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<
    'sales' | 'revenue' | 'gap' | 'concentration' | 'recent'
  >('sales');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ApiMarketCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [debounced, brand, category, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getMarketCards({
        search: debounced,
        brand,
        category,
        sort,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debounced, brand, category, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cards…"
              className="pl-9 bg-black/40 border-white/10"
            />
          </div>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-full sm:w-[150px] bg-black/40 border-white/10">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              <SelectItem value="pokemon">Pokémon</SelectItem>
              <SelectItem value="one_piece">One Piece</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[140px] bg-black/40 border-white/10">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="raw">Raw</SelectItem>
              <SelectItem value="slab">Slab</SelectItem>
              <SelectItem value="sealed">Sealed</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => setSort(v as typeof sort)}>
            <SelectTrigger className="w-full sm:w-[170px] bg-black/40 border-white/10">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Most sales</SelectItem>
              <SelectItem value="revenue">Top revenue</SelectItem>
              <SelectItem value="gap">Widest price gap</SelectItem>
              <SelectItem value="concentration">Most concentrated</SelectItem>
              <SelectItem value="recent">Recently sold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No cards match — try different filters.
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-3">
              {total.toLocaleString()} card{total === 1 ? '' : 's'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b border-white/5">
                    <th className="py-3 pr-4">Card</th>
                    <th className="py-3 pr-4 hidden md:table-cell">Supply</th>
                    <th className="py-3 pr-4">Sales</th>
                    <th className="py-3 pr-4 hidden lg:table-cell">
                      Concentration
                    </th>
                    <th className="py-3 pr-4">Liquidity</th>
                    <th className="py-3 pr-4 hidden md:table-cell">
                      Market (comps)
                    </th>
                    <th className="py-3 pr-4 hidden lg:table-cell">Gap</th>
                    <th className="py-3 pr-2 w-[40px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setOpenId(c.id)}
                      className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium text-white truncate max-w-[280px] flex items-center gap-2">
                          <span className="truncate">{c.name}</span>
                          {c.whaleRecent && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px] font-normal border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[#B4FF39]"
                            >
                              🐋 whale
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[brandLabel(c.brand), c.category, c.grade]
                            .filter(Boolean)
                            .join(' · ')}
                          {c.price != null ? ` · ${formatUsd(c.price)}` : ''}
                        </div>
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell text-white/80">
                        {c.stock}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-white">{c.sales}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          / {c.buyers} buyer{c.buyers === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 hidden lg:table-cell">
                        {c.concentrationPct != null ? (
                          <span
                            className={
                              c.concentrationPct >= 50
                                ? 'text-amber-300'
                                : 'text-white/80'
                            }
                          >
                            {c.concentrationPct}% top buyer
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {c.liquidity ? (
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-normal ${LIQ_STYLES[c.liquidity]}`}
                          >
                            {c.liquidity}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell">
                        {c.comps?.median != null ? (
                          <div>
                            <div className="text-white/90">
                              {formatUsd(c.comps.median)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {c.comps.low != null && c.comps.high != null
                                ? `${formatUsd(c.comps.low)}–${formatUsd(c.comps.high)}`
                                : `${c.comps.count} comps`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            no comps
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 hidden lg:table-cell text-white/80">
                        {pct(c.priceGapPct)}
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <div className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-white/10 bg-white/5"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-white/10 bg-white/5"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <MarketCardDialog
        cardId={openId}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------

const Stat = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) => (
  <div className="rounded-lg border border-white/5 bg-black/30 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div
      className={`mt-0.5 text-sm font-semibold ${accent ? 'text-[#B4FF39]' : 'text-white'}`}
    >
      {value}
    </div>
  </div>
);

const ForecastPanel = ({
  forecast,
  generatedAt,
  loading,
  generating,
  onGenerate,
  onRefresh,
}: {
  forecast: ApiCardForecast | null;
  generatedAt: string | null;
  loading: boolean;
  generating: boolean;
  onGenerate: () => void;
  onRefresh: () => void;
}) => {
  const header = (
    <div className="flex items-center gap-2">
      <Radar className="h-4 w-4 text-[#B4FF39]" />
      <span className="text-xs font-medium uppercase tracking-wide text-white/80">
        Predictive intelligence
      </span>
      <span className="text-[10px] text-muted-foreground">AI estimate</span>
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        {header}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading forecast…
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        {header}
        <p className="mt-2 text-xs text-muted-foreground">
          Claude fuses our demand signals with live web research (social buzz,
          upcoming events, grading &amp; supply news, comparable precedents) into
          a scenario-weighted price forecast.
        </p>
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={generating}
          className="mt-3 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Researching…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Generate forecast
            </>
          )}
        </Button>
        {generating && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            This runs live web searches — it can take 20–60 seconds.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#B4FF39]/20 bg-[#B4FF39]/[0.04] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        {header}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={generating}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`}
          />
          {generating ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <ForecastBrief forecast={forecast} generatedAt={generatedAt} />
    </div>
  );
};

const MarketCardDialog = ({
  cardId,
  onClose,
}: {
  cardId: string | null;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ApiMarketCardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<ApiCardForecast | null>(null);
  const [forecastAt, setForecastAt] = useState<string | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!cardId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoading(true);
    setDetail(null);
    setForecast(null);
    setForecastAt(null);
    setForecastLoading(true);
    analyticsAPI
      .getMarketCard(cardId)
      .then(d => active && setDetail(d))
      .catch(() => active && setDetail(null))
      .finally(() => active && setLoading(false));
    analyticsAPI
      .getCardForecast(cardId)
      .then(r => {
        if (!active || !r) return;
        setForecast(r.forecast);
        setForecastAt(r.generatedAt);
      })
      .catch(() => {})
      .finally(() => active && setForecastLoading(false));
    return () => {
      active = false;
    };
  }, [cardId]);

  const runForecast = async (refresh: boolean) => {
    if (!cardId) return;
    setGenerating(true);
    try {
      const r = await analyticsAPI.generateCardForecast(cardId, refresh);
      setForecast(r.forecast);
      setForecastAt(r.generatedAt);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Forecast failed. Check the Anthropic key & try again.';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={!!cardId} onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-2xl max-h-[88vh] overflow-y-auto">
        {loading || !detail ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-base pr-6">{detail.name}</DialogTitle>
              <div className="text-xs text-muted-foreground">
                {[brandLabel(detail.brand), detail.category, detail.grade]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </DialogHeader>

            {/* AI Hold/Sell */}
            {detail.recommendation && (
              <div className="rounded-lg border border-[#B4FF39]/20 bg-[#B4FF39]/[0.04] p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="h-4 w-4 text-[#B4FF39]" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    AI recommendation
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-medium ${
                      VERDICT_STYLES[detail.recommendation.verdict] ??
                      'border-white/10 bg-white/5 text-white/70'
                    }`}
                  >
                    {detail.recommendation.verdict}
                  </Badge>
                </div>
                <p className="text-sm text-white/85">
                  {detail.recommendation.reasoning}
                </p>
              </div>
            )}

            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Stat
                label="Our price"
                value={detail.price != null ? formatUsd(detail.price) : '—'}
              />
              <Stat
                label="Market median"
                value={
                  detail.comps?.median != null
                    ? formatUsd(detail.comps.median)
                    : '—'
                }
                accent
              />
              <Stat
                label="vs Market"
                value={
                  detail.vsMarketPct == null
                    ? '—'
                    : `${detail.vsMarketPct > 0 ? '+' : ''}${detail.vsMarketPct}%`
                }
              />
              <Stat
                label="Market range"
                value={
                  detail.comps?.min != null && detail.comps?.max != null
                    ? `${formatUsd(detail.comps.min)}–${formatUsd(detail.comps.max)}`
                    : '—'
                }
              />
              <Stat label="Price gap" value={pct(detail.priceGapPct)} />
              <Stat label="Liquidity" value={detail.liquidity ?? '—'} />
              <Stat label="Sales" value={`${detail.sales} / ${detail.buyers} buyers`} />
              <Stat
                label="Top-buyer share"
                value={pct(detail.concentrationPct)}
              />
              <Stat label="Supply (stock)" value={detail.stock} />
              <Stat
                label="Median days to sale"
                value={detail.timeToSaleDays ?? '—'}
              />
              <Stat label="Revenue" value={formatUsd(detail.revenueUsd)} />
              <Stat
                label="Last sale"
                value={
                  detail.lastSaleAt
                    ? moment(detail.lastSaleAt).fromNow()
                    : '—'
                }
              />
            </div>

            {/* Market history + charts */}
            <CardMarketProfile cardId={detail.id} />

            {/* Predictive intelligence */}
            <ForecastPanel
              forecast={forecast}
              generatedAt={forecastAt}
              loading={forecastLoading}
              generating={generating}
              onGenerate={() => runForecast(false)}
              onRefresh={() => runForecast(true)}
            />

            {/* Top buyers */}
            {detail.topBuyers.length > 0 && (
              <div>
                <div className="text-xs font-medium text-white/80 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Who's buying it
                </div>
                <div className="space-y-1">
                  {detail.topBuyers.map(b => (
                    <button
                      key={b.userId}
                      type="button"
                      onClick={() => navigate(`/analytics/${b.userId}`)}
                      className="w-full flex items-center justify-between gap-2 rounded-md border border-white/5 bg-black/30 px-3 py-2 text-left hover:bg-white/5"
                    >
                      <span className="text-sm text-white truncate">
                        {b.name || b.username || 'Unknown'}
                        {b.username && (
                          <span className="text-muted-foreground">
                            {' '}
                            @{b.username}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {b.units} bought · {b.sharePct}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent comps */}
            {detail.recentComps.length > 0 && (
              <div>
                <div className="text-xs font-medium text-white/80 mb-2">
                  Recent eBay sold comps
                </div>
                <div className="space-y-1">
                  {detail.recentComps.slice(0, 8).map((c, i) => (
                    <a
                      key={i}
                      href={c.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-black/30 px-3 py-2 hover:bg-white/5"
                    >
                      <span className="text-xs text-white/80 truncate flex-1">
                        {c.title}
                      </span>
                      <span className="text-xs text-white shrink-0">
                        {c.price != null ? formatUsd(c.price) : '—'}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {c.soldAt ? moment(c.soldAt).format('MMM D') : ''}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
