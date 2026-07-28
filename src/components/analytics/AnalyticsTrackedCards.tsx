import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
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
import { CardMarketProfile } from './CardMarketProfile';
import { ForecastBrief } from './ForecastBrief';
import { analyticsAPI } from '@/integrations/api/client';
import type { ApiTrackedCard, ApiCardForecast } from '@/types/analytics-api';
import {
  Search,
  Loader2,
  Plus,
  Trash2,
  ChevronRight,
  Radar,
  RefreshCw,
  Sparkles,
  Wallet,
  Eye,
} from 'lucide-react';

const BRANDS = ['pokemon', 'one_piece', 'sports', 'other'] as const;
const CATEGORIES = ['raw', 'slab', 'sealed', 'other'] as const;

const BRAND_LABEL: Record<string, string> = {
  pokemon: 'Pokémon',
  one_piece: 'One Piece',
  sports: 'Sports',
  other: 'Other',
};

/**
 * Tracked Cards — per-card research. Cards are explicitly tracked (added by
 * admins today; saved to user profiles once sign-ups reopen) and enriched with
 * EXTERNAL market data only: multi-source price profiles and AI forecasts from
 * live web research. Previously a sub-view of the Market tab; now its own tab.
 */
export const AnalyticsTrackedCards = ({
  refreshSignal,
  onChange,
}: {
  /** Bump to refetch (e.g. after a sale draws a holding down). */
  refreshSignal?: number;
  /** Fired when a card moves buckets so holdings above can refresh. */
  onChange?: () => void;
} = {}) => {
  const [cards, setCards] = useState<ApiTrackedCard[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState<ApiTrackedCard | null>(null);

  // Add-card form
  const [name, setName] = useState('');
  const [brand, setBrand] = useState<string>('pokemon');
  const [category, setCategory] = useState<string>('raw');
  const [grade, setGrade] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await analyticsAPI.getMarketCards({
        search: debounced || undefined,
        limit,
        // Watchlist only — owned cards live in My Holdings above.
        owned: false,
      });
      setCards(r.data);
      setTotal(r.total);
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [debounced, limit]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const addCard = async () => {
    const n = name.trim();
    if (!n || adding) return;
    setAdding(true);
    try {
      const card = await analyticsAPI.addTrackedCard({
        name: n,
        brand,
        category,
        grade: grade.trim() || undefined,
      });
      setName('');
      setGrade('');
      toast.success(`Now watching “${card.name}”`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not watch that card.');
    } finally {
      setAdding(false);
    }
  };

  /** Promote a watched card into holdings — the only UI path between buckets. */
  const markOwned = async (card: ApiTrackedCard) => {
    try {
      await analyticsAPI.updateHolding(card.id, { owned: true });
      toast.success(`Moved “${card.name}” to your holdings`);
      onChange?.();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not move that card.');
    }
  };

  const removeCard = async (card: ApiTrackedCard) => {
    try {
      await analyticsAPI.removeTrackedCard(card.id);
      toast.success(`Stopped watching “${card.name}”`);
      if (openCard?.id === card.id) setOpenCard(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not unwatch.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Watchlist — add + list in one continuous section */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        {/* Header (matches My Holdings) */}
        <div className="mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-xs font-medium uppercase tracking-wide text-white/80">
            Watchlist
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-muted-foreground">
            {total}
          </span>
        </div>

        {/* Add a card */}
        <p className="text-xs text-muted-foreground mb-3">
          Add any card to your watchlist to get market profiles, price history,
          and AI forecasts built from live external data.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCard()}
            placeholder='e.g. "Crown Zenith Charizard VSTAR UPC #GG69"'
            className="flex-1 min-w-[240px] bg-black/40 border-white/10"
          />
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-full sm:w-[130px] bg-black/40 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANDS.map(b => (
                <SelectItem key={b} value={b}>
                  {BRAND_LABEL[b]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[110px] bg-black/40 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={grade}
            onChange={e => setGrade(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCard()}
            placeholder="Grade (e.g. PSA 10)"
            className="w-full sm:w-[150px] bg-black/40 border-white/10"
          />
          <Button
            onClick={addCard}
            disabled={!name.trim() || adding}
            className="bg-[#B4FF39] text-black hover:bg-[#a2e833] disabled:opacity-40"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" /> Watch
              </>
            )}
          </Button>
        </div>

        {/* Divider → watched list */}
        <div className="my-4 border-t border-white/5" />

        <div className="mb-3 flex items-center justify-end">
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search watched cards…"
              className="pl-9 bg-black/40 border-white/10"
            />
          </div>
        </div>

        {loading && cards.length === 0 ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : cards.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No watched cards yet — add one above to start building market
            profiles and forecasts.
          </div>
        ) : (
          <div className="space-y-1.5">
            {cards.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2.5 hover:bg-white/[0.04]"
              >
                <button
                  type="button"
                  onClick={() => setOpenCard(c)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-start gap-2">
                    {/* Wrap, don't clip — the tail of a card name carries the
                        parallel and number that identify it. */}
                    <span className="break-words text-sm text-white/90">
                      {c.name}
                    </span>
                    {c.grade && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[10px] text-[#B4FF39]"
                      >
                        {c.grade}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {[
                      c.brand ? (BRAND_LABEL[c.brand] ?? c.brand) : null,
                      c.category,
                      `added ${moment(c.createdAt).fromNow()}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markOwned(c)}
                  className="h-8 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-[#B4FF39]"
                  title="Move this to My Holdings"
                >
                  <Wallet className="h-3.5 w-3.5" /> I own this
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCard(c)}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-400"
                  aria-label="Stop watching"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ChevronRight
                  className="h-4 w-4 shrink-0 cursor-pointer text-muted-foreground"
                  onClick={() => setOpenCard(c)}
                />
              </div>
            ))}
            {total > cards.length && (
              <button
                type="button"
                onClick={() => setLimit(l => l + 50)}
                className="w-full rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-center text-xs text-muted-foreground hover:bg-white/5 hover:text-white"
              >
                Load more ({total - cards.length})
              </button>
            )}
          </div>
        )}
      </Card>

      {openCard && (
        <TrackedCardDialog card={openCard} onClose={() => setOpenCard(null)} />
      )}
    </div>
  );
};

/** Per-card research: multi-source market profile + AI forecast. */
const TrackedCardDialog = ({
  card,
  onClose,
}: {
  card: ApiTrackedCard;
  onClose: () => void;
}) => {
  const [forecast, setForecast] = useState<ApiCardForecast | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingForecast(true);
    setForecast(null);
    analyticsAPI
      .getCardForecast(card.id)
      .then(r => {
        if (!active) return;
        if (r) {
          setForecast(r.forecast);
          setGeneratedAt(r.generatedAt);
        }
      })
      .catch(() => undefined)
      .finally(() => active && setLoadingForecast(false));
    return () => {
      active = false;
    };
  }, [card.id]);

  const generate = async (refresh: boolean) => {
    setGenerating(true);
    try {
      const r = await analyticsAPI.generateCardForecast(card.id, refresh);
      setForecast(r.forecast);
      setGeneratedAt(r.generatedAt);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Forecast generation failed.',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/10 bg-[rgba(18,18,18,1)]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-white">
            {card.name}
            {card.grade && (
              <Badge
                variant="outline"
                className="border-[#B4FF39]/30 bg-[#B4FF39]/10 text-xs text-[#B4FF39]"
              >
                {card.grade}
              </Badge>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {[
              card.brand ? (BRAND_LABEL[card.brand] ?? card.brand) : null,
              card.category,
              `watched since ${moment(card.createdAt).format('MMM D, YYYY')}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <CardMarketProfile cardId={card.id} />

          <ForecastPanel
            forecast={forecast}
            generatedAt={generatedAt}
            loading={loadingForecast}
            generating={generating}
            onGenerate={() => generate(false)}
            onRefresh={() => generate(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
          Claude researches this card across the live web (recent sold prices,
          social buzz, upcoming events, grading &amp; supply news, comparable
          precedents) into a scenario-weighted price forecast.
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
