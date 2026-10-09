import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Flame,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Tag,
  Users,
  Eye,
  Star,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { MarketTrendChart } from './MarketTrendChart';
import { InfoTip, TermTip } from './InfoTip';
import { recordHolder, toHeatIndex, toHeatIndexDelta } from './heatScale';
import { marketHeatAPI, marketEngagementAPI, marketTaxonomyAPI } from '@/integrations/api/client';
import type {
  ApiHeatDriver,
  ApiMarketHeatPoint,
  ApiMarketHeatMover,
  ApiMarketHeatScale,
  ApiMarketEngagementPoint,
  ApiTaxonomyNode,
} from '@/types/analytics-api';

/** label → safe, unique-ish node key slug. */
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

const KINDS = [
  { k: 'player', label: 'Player / Character', scope: 'player', example: 'e.g. Ja Morant or Charizard' },
  { k: 'card', label: 'Card', scope: 'card', example: 'e.g. Base Set Charizard' },
  { k: 'set', label: 'Set', scope: 'set', example: 'e.g. Pokémon 151' },
  { k: 'market', label: 'Whole market', scope: 'segment', example: 'e.g. Flesh and Blood' },
] as const;

/** Words that pin an eBay search to a market (sports needs none — names carry it). */
const MARKET_QUERY_PREFIX: Record<string, string> = {
  pokemon: 'pokemon',
  one_piece: 'one piece',
  sports: '',
  magic: 'mtg',
  lorcana: 'lorcana',
};

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * eBay searches aren't category-filtered, so a bare name ("hunter x hunter")
 * pulls in manga, figures and keychains. A card word keeps it to cards.
 */
const CARD_WORD = /\b(cards?|tcg|ccg|psa|bgs|cgc|sgc|slab|graded)\b/i;
const needsCardWord = (q: string) => !!q.trim() && !CARD_WORD.test(q);
const withCardWord = (q: string) => (needsCardWord(q) ? `${q.trim()} card` : q.trim());

/** Suggested eBay search from the name: "Ja Morant" → "ja morant card", "Umbreon" (Pokémon) → "pokemon umbreon card". */
const suggestQuery = (kind: string, market: string, name: string) => {
  const n = stripAccents(name.trim().toLowerCase()).replace(/\s+/g, ' ');
  if (!n) return '';
  const prefix = kind === 'market' ? '' : MARKET_QUERY_PREFIX[market] ?? '';
  const head = prefix && !n.includes(prefix) ? `${prefix} ` : '';
  return withCardWord(`${head}${n}`);
};

/**
 * Under a search box: says when we've added "card" to keep eBay to trading
 * cards, with a toggle to search all of eBay instead.
 */
const CardWordNote = ({
  query,
  allEbay,
  onToggle,
}: {
  query: string;
  allEbay: boolean;
  onToggle: () => void;
}) =>
  needsCardWord(query) ? (
    <div className="mt-1 text-[11px] text-white/50">
      {allEbay ? (
        <>Searching all of eBay, so manga, figures and other merch are included. </>
      ) : (
        <>
          Searching <span className="text-white/80">“{withCardWord(query)}”</span>. We added “card”
          so eBay sticks to trading cards.{' '}
        </>
      )}
      <button type="button" onClick={onToggle} className="text-white/60 underline hover:text-[#B4FF39]">
        {allEbay ? 'Only cards' : 'Search all of eBay'}
      </button>
    </div>
  ) : null;

interface QueryPreview {
  total: number;
  items: { title: string; priceUsd: number | null; url: string }[];
}

const errMsg = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const SCOPES = [
  { k: 'segment', label: 'Markets' },
  { k: 'set', label: 'Sets' },
  { k: 'player', label: 'Players' },
  { k: 'card', label: 'Cards' },
  { k: 'all', label: 'All' },
] as const;

const MARKETS = [
  { k: 'all', label: 'All markets' },
  { k: 'pokemon', label: 'Pokémon' },
  { k: 'one_piece', label: 'One Piece' },
  { k: 'sports', label: 'Sports' },
  { k: 'magic', label: 'Magic' },
  { k: 'lorcana', label: 'Lorcana' },
] as const;

const heatColor = (n: number | null) =>
  n == null ? '#6b7280' : n >= 70 ? '#B4FF39' : n >= 45 ? '#fbbf24' : '#f87171';
const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString()}`;
// Capped so a one-off glitch (e.g. eBay's total jumping 5 → 45k) doesn't print "+918080.0%".
const pct = (n: number | null | undefined) =>
  n == null ? null : n > 999 ? '>+999%' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

/** A small momentum chip. `invert` flips color meaning (rising supply = cooling). */
const Momentum = ({
  label,
  value,
  invert,
  tip,
}: {
  label: string;
  value: number | null | undefined;
  invert?: boolean;
  tip?: ReactNode;
}) => {
  const labelEl = label ? (tip ? <TermTip tip={tip}>{label}</TermTip> : label) : null;
  if (value == null)
    return (
      <span className="text-[11px] text-muted-foreground">
        {labelEl} <span className="text-white/40">—</span>
      </span>
    );
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.5;
  const color = flat ? '#9ca3af' : good ? '#B4FF39' : '#f87171';
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      {labelEl}
      <Icon className="h-3 w-3" style={{ color }} />
      <span style={{ color }}>{pct(value)}</span>
    </span>
  );
};

/** Placeholder rows shaped like the leaderboard, shown until the first load for a scope lands. */
const HeatRowsSkeleton = () => (
  <div className="space-y-2" aria-busy="true" aria-label="Loading market heat">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-lg border border-white/8 bg-black/20 p-3">
        <div className="flex w-12 shrink-0 flex-col items-center gap-1">
          <Skeleton className="h-5 w-8 bg-white/10" />
          <Skeleton className="h-2 w-6 bg-white/5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32 bg-white/10" />
          <Skeleton className="h-1.5 w-full rounded-full bg-white/10" />
          <div className="flex gap-3">
            {[16, 14, 12, 10].map((w, j) => (
              <Skeleton key={j} className="h-3 bg-white/5" style={{ width: `${w * 4}px` }} />
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** The heat score's sub-scores, in display order, with what each one means. */
const DRIVERS: {
  key: ApiHeatDriver['key'];
  label: string;
  tip: string;
  /** The raw signal behind the sub-score. */
  detail: (r: ApiMarketHeatPoint) => ReactNode;
  empty: string;
  /** Momentum sub-scores sit at 50 when nothing's moving. */
  centered?: boolean;
  /** Only scored (and shown) for single cards. */
  cardsOnly?: boolean;
}[] = [
  {
    key: 'price',
    label: 'Price',
    tip: 'Are asking prices climbing? 50 means flat. Higher means asks are up since the last snapshot.',
    detail: r => <Momentum label="asks" value={r.askChangePct} />,
    empty: 'needs 2 snapshots',
    centered: true,
  },
  {
    key: 'supply',
    label: 'Supply',
    tip: 'Are listings drying up? 50 means flat. Higher means fewer listings than last time, which runs hotter.',
    detail: r => <Momentum label="listings" value={r.totalActiveChangePct} invert />,
    empty: 'needs 2 snapshots',
    centered: true,
  },
  {
    key: 'listed',
    label: 'Listed',
    tip: "How scarce this card is, by how many copies are listed right now. Fewer listed means scarcer, which runs hotter. 10 or fewer scores 100, 100,000+ scores 0, and every 10× more listings costs 25 points.",
    detail: r => `${(r.totalActive ?? 0).toLocaleString()} listed`,
    empty: 'no listing count',
    cardsOnly: true,
  },
  {
    key: 'sellThrough',
    label: 'Sell-through',
    tip: 'How many of the listings we sampled last time are gone now (sold or pulled). 40% or more scores 100.',
    detail: r => (r.clearedRatePct != null ? `${r.clearedRatePct.toFixed(0)}% gone` : null),
    empty: 'needs 2 snapshots',
  },
  {
    key: 'freshness',
    label: 'Freshness',
    tip: "How few listings have sat 14+ days. Higher means cards are moving instead of going stale. It only counts once some listings have aged.",
    detail: r =>
      r.agingPct != null
        ? `${r.agingPct.toFixed(0)}% stale${r.medianDaysListed != null ? ` · ${r.medianDaysListed.toFixed(0)}d typical` : ''}`
        : null,
    empty: 'nothing stale yet',
  },
  {
    key: 'buzz',
    label: 'Buzz',
    tip: 'Recent mentions on Reddit, YouTube and Bluesky. 50 or more mentions scores 100.',
    detail: r => `${r.extra?.social?.mentions ?? 0} mentions`,
    empty: 'no buzz data',
  },
  {
    key: 'tracking',
    label: 'Tracking',
    tip: 'People on our platform adding these cards to a portfolio or watchlist in the last 7 days. 5 or more scores 100.',
    detail: r => `${r.extra?.firstParty?.recentAdds ?? 0} adds this week`,
    empty: 'no adds this week',
  },
];

/** Sub-score grid under a heat row: what's pushing this market's heat up or down. */
const DriverGrid = ({ row, drivers }: { row: ApiMarketHeatPoint; drivers: ApiHeatDriver[] }) => {
  const shown = DRIVERS.filter(d => !d.cardsOnly || row.scope === 'card');
  return (
  <div
    className={`mt-2 grid grid-cols-3 gap-x-4 gap-y-2 ${
      shown.length > 6 ? 'sm:grid-cols-7' : 'sm:grid-cols-6'
    }`}
  >
    {shown.map(d => {
      const drv = drivers.find(x => x.key === d.key);
      const share = drv ? Math.round(drv.share * 100) : null;
      return (
        <div key={d.key} className={`min-w-0 ${drv ? '' : 'opacity-40'}`}>
          <div className="flex items-baseline justify-between gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
            <TermTip
              tip={
                <>
                  {d.tip}{' '}
                  {share != null
                    ? `It makes up ${share}% of this market's heat.`
                    : "It isn't counted yet because there's no data for it."}
                </>
              }
            >
              {d.label}
            </TermTip>
            {share != null && <span className="text-white/30">{share}%</span>}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className="w-6 shrink-0 text-xs font-semibold tabular-nums"
              style={{ color: drv ? heatColor(drv.score) : undefined }}
            >
              {drv?.score ?? '—'}
            </span>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              {drv && (
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(3, drv.score)}%`, background: heatColor(drv.score) }}
                />
              )}
              {d.centered && <span className="absolute left-1/2 top-0 h-full w-px bg-white/40" />}
            </div>
          </div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {drv ? d.detail(row) : d.empty}
          </div>
        </div>
      );
    })}
  </div>
  );
};

const inputCls =
  'rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-white/25';

const fieldLabelCls = 'mb-1 block text-[11px] font-medium text-white/60';

/**
 * Add a new tracked market (player / card / set / whole market). The eBay
 * search is suggested from the name and live-checked as you type.
 */
const AddMarketForm = ({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) => {
  const [kind, setKind] = useState<ApiTaxonomyNode['kind']>('player');
  const [market, setMarket] = useState('sports');
  const [label, setLabel] = useState('');
  // null = follow the suggestion from the name; a string = the user's own search.
  const [customQuery, setCustomQuery] = useState<string | null>(null);
  // Opt out of the auto-added "card" word.
  const [allEbay, setAllEbay] = useState(false);
  const [preview, setPreview] = useState<QueryPreview | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [saving, setSaving] = useState(false);

  const isMarket = kind === 'market';
  const kindDef = KINDS.find(x => x.k === kind) ?? KINDS[0];
  const suggested = suggestQuery(kind, market, label);
  const typed = customQuery ?? suggested;
  // What we actually search and save.
  const query = allEbay ? typed.trim() : withCardWord(typed);
  const canAdd = !!label.trim() && !!query.trim() && !saving;

  // Live-check the search against eBay once typing settles.
  useEffect(() => {
    const q = query.trim();
    setPreview(null);
    if (q.length < 3) {
      setPreviewState('idle');
      return;
    }
    setPreviewState('loading');
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const p = await marketHeatAPI.preview(q);
        if (!cancelled) {
          setPreview(p);
          setPreviewState('done');
        }
      } catch {
        if (!cancelled) setPreviewState('error');
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const add = async () => {
    if (!canAdd) return;
    setSaving(true);
    const key = `custom_${kind}_${slugify(label)}`;
    try {
      await marketTaxonomyAPI.createNode({
        key,
        kind,
        rootMarket: isMarket ? key : market,
        parentKey: isMarket ? undefined : market,
        label: label.trim(),
        query: query.trim(),
        matchTerms: [label.trim().toLowerCase()],
        heatScope: kindDef.scope,
      });
      const snap = await marketHeatAPI.collectOne(key).catch(() => null);
      toast.success(`Now tracking ${label.trim()}`, {
        description: snap
          ? 'Listings and price are in. Its heat score fills in after the next snapshot, since heat measures change over time.'
          : "We couldn't reach eBay just now. It'll be picked up on the next snapshot.",
      });
      onDone();
    } catch (e) {
      toast.error(errMsg(e, 'Add failed (name may already be tracked)'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={e => { e.preventDefault(); add(); }}
      className="mb-4 rounded-lg border border-[#B4FF39]/20 bg-[#B4FF39]/[0.03] p-3 sm:p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-white">Track a new market</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            We'll snapshot its live eBay listings every day and give it a heat score.
          </div>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close" className="text-white/40 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {/* What kind of thing */}
        <div>
          <span id="add-kind-label" className={fieldLabelCls}>What are you tracking?</span>
          <div
            role="radiogroup"
            aria-labelledby="add-kind-label"
            className="inline-flex flex-wrap rounded-md border border-white/10 bg-black/40 p-0.5"
          >
            {KINDS.map(k => (
              <button
                key={k.k}
                type="button"
                role="radio"
                aria-checked={kind === k.k}
                onClick={() => setKind(k.k)}
                className={`h-7 rounded px-3 text-[11px] transition-colors ${
                  kind === k.k ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Market + name */}
        <div className={`grid gap-3 ${isMarket ? '' : 'sm:grid-cols-[180px_1fr]'}`}>
          {!isMarket && (
            <div>
              <label htmlFor="add-market" className={fieldLabelCls}>Market</label>
              <select
                id="add-market"
                value={market}
                onChange={e => setMarket(e.target.value)}
                className={`w-full ${inputCls}`}
              >
                {MARKETS.filter(m => m.k !== 'all').map(m => (
                  <option key={m.k} value={m.k} className="bg-[#161616]">{m.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="add-name" className={fieldLabelCls}>Name</label>
            <input
              id="add-name"
              autoFocus
              className={`w-full ${inputCls}`}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={kindDef.example}
            />
          </div>
        </div>

        {/* eBay search — suggested from the name, live-checked */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="add-query" className={fieldLabelCls}>eBay search</label>
            {customQuery != null && suggested && customQuery !== suggested && (
              <button
                type="button"
                onClick={() => setCustomQuery(null)}
                className="text-[11px] text-white/50 hover:text-[#B4FF39]"
              >
                Use suggested
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
            <input
              id="add-query"
              className={`w-full pl-6 ${inputCls}`}
              value={typed}
              onChange={e => setCustomQuery(e.target.value)}
              placeholder="Filled in from the name"
            />
          </div>
          <CardWordNote query={typed} allEbay={allEbay} onToggle={() => setAllEbay(v => !v)} />
          <div className="mt-1 min-h-[16px] text-[11px]">
            {previewState === 'loading' ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking eBay…
              </span>
            ) : previewState === 'error' ? (
              <span className="text-muted-foreground">
                Couldn't check this search on eBay right now. You can still add it.
              </span>
            ) : previewState === 'done' && preview && preview.total === 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <AlertTriangle className="h-3 w-3" /> No live listings match. Try fewer or broader
                words.
              </span>
            ) : previewState === 'done' && preview ? (
              <span className="text-muted-foreground">
                <span className="text-[#B4FF39]">≈ {preview.total.toLocaleString()}</span> live
                listings
                {preview.items[0] && (
                  <span className="text-white/40"> · e.g. “{preview.items[0].title.slice(0, 60)}”</span>
                )}
              </span>
            ) : (
              <span className="text-white/40">
                We suggest a search from the name. Edit it to narrow things down.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/5 pt-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-8 text-xs text-white/60 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!canAdd}
          className="h-8 gap-1.5 bg-[#B4FF39] text-xs text-black hover:bg-[#a3ee28] disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {saving ? 'Adding…' : 'Add & snapshot'}
        </Button>
      </div>
    </form>
  );
};

/** Inline editor for an existing heat row — label + eBay query. */
const RowEditor = ({
  row,
  onDone,
  onCancel,
}: {
  row: ApiMarketHeatPoint;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const [label, setLabel] = useState(row.label ?? row.segment);
  const [query, setQuery] = useState(row.sampleQuery ?? '');
  const [allEbay, setAllEbay] = useState(false);
  const [saving, setSaving] = useState(false);

  // Only touch the search if it was edited — a label-only save must not
  // rewrite (and so re-baseline) an existing search.
  const queryEdited = query.trim() !== (row.sampleQuery ?? '').trim();
  const finalQuery = !queryEdited || allEbay ? query.trim() : withCardWord(query);

  const save = async (snapshot: boolean) => {
    setSaving(true);
    try {
      await marketTaxonomyAPI.updateNode(row.segment, {
        label: label.trim() || row.segment,
        query: finalQuery || null,
      });
      if (snapshot) await marketHeatAPI.collectOne(row.segment).catch(() => null);
      toast.success('Saved');
      onDone();
    } catch (e) {
      toast.error(errMsg(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <input className={`w-full ${inputCls} py-1`} value={label} onChange={e => setLabel(e.target.value)} placeholder="Label" />
      <input className={`w-full ${inputCls} py-1`} value={query} onChange={e => setQuery(e.target.value)} placeholder="eBay search" />
      {queryEdited && (
        <>
          <CardWordNote query={query} allEbay={allEbay} onToggle={() => setAllEbay(v => !v)} />
          <div className="text-[11px] text-white/40">
            A new search starts fresh, so its heat score comes back after the next snapshot.
          </div>
        </>
      )}
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => save(true)} disabled={saving} className="h-7 gap-1 bg-[#B4FF39] text-[11px] text-black hover:bg-[#a3ee28]">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save &amp; snapshot
        </Button>
        <Button size="sm" variant="ghost" onClick={() => save(false)} disabled={saving} className="h-7 text-[11px] text-white/70 hover:text-white">
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 gap-1 text-[11px] text-white/50 hover:text-white">
          <X className="h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
};

/**
 * Real-time market heat — leading indicators from daily active-listing
 * snapshots (supply level + supply/price momentum), ahead of sold comps.
 * Editable: add/edit/remove tracked players, cards, and sets inline.
 */
export const MarketHeatPanel = () => {
  const [scope, setScope] = useState<string>('segment');
  const [market, setMarket] = useState<string>('all');
  const [rows, setRows] = useState<ApiMarketHeatPoint[]>([]);
  const [movers, setMovers] = useState<ApiMarketHeatMover[]>([]);
  const [engagement, setEngagement] = useState<Record<string, ApiMarketEngagementPoint>>({});
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [scale, setScale] = useState<ApiMarketHeatScale | null>(null);
  // scope|market the current rows belong to — a mismatch means they're stale, so show skeletons.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const reqId = useRef(0);
  const viewKey = `${scope}|${market}`;

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const [l, m, e, s] = await Promise.all([
        marketHeatAPI.latest(scope, market),
        marketHeatAPI.movers(scope, 6),
        marketEngagementAPI.latest(scope, market).catch(() => []),
        marketHeatAPI.scale().catch(() => null),
      ]);
      // A newer scope/market request superseded this one.
      if (id !== reqId.current) return;
      setLoadedKey(`${scope}|${market}`);
      setScale(s);
      setRows(
        [...l].sort((a, b) => (b.heatScore ?? -1) - (a.heatScore ?? -1))
      );
      setMovers(m);
      setEngagement(
        Object.fromEntries((e as ApiMarketEngagementPoint[]).map(x => [x.segment, x]))
      );
    } catch {
      /* keep last known */
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [scope, market]);

  useEffect(() => {
    load();
  }, [load]);

  const collect = async () => {
    if (collecting) return;
    setCollecting(true);
    try {
      await marketHeatAPI.collect();
      await load();
      toast.success('Snapshots refreshed');
    } catch (e) {
      toast.error(errMsg(e, 'Snapshot refresh failed'));
    } finally {
      setCollecting(false);
    }
  };

  const remove = async (key: string, label: string | null) => {
    if (!window.confirm(`Stop tracking "${label ?? key}"? This removes it from the board.`)) return;
    setRemovingKey(key);
    try {
      await marketTaxonomyAPI.deleteNode(key);
      await marketHeatAPI.remove(key).catch(() => null);
      toast.success('Removed');
      await load();
    } catch (e) {
      toast.error(errMsg(e, 'Remove failed (markets with sub-nodes can’t be removed here)'));
    } finally {
      setRemovingKey(null);
    }
  };

  const updated = rows[0]?.capturedAt ?? null;
  const stale = loadedKey !== viewKey;
  const busy = loading || collecting;

  return (
    <Card className="relative overflow-hidden bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
      {/* Busy bar — any load or snapshot in flight */}
      {busy && (
        <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-[#B4FF39]/70" />
      )}
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-sm font-medium text-white">Live market heat</span>
          <InfoTip side="bottom">
            A daily read on the live market, taken from eBay's active listings (not sold
            data). Each market gets a heat score that leans mostly on where supply and prices
            are heading, then factors in how fast cards sell, how long they sit, social buzz,
            and our own views and saves. Scores are scaled to our all-time record: 100 is the
            hottest reading we've ever recorded and 0 is the coldest. The idea is to catch a
            market heating up before the sold comps show it.
          </InfoTip>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            early signals from live listings, before the sold comps
          </span>
        </div>
        <div className="flex items-center gap-2">
          {busy ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {collecting ? 'collecting…' : 'updating…'}
            </span>
          ) : (
            updated && (
              <span className="text-[11px] text-muted-foreground">
                {moment(updated).fromNow()}
              </span>
            )
          )}
          <Button
            data-tour="mh-add"
            variant="outline"
            size="sm"
            onClick={() => setShowAdd(s => !s)}
            className="h-8 gap-1.5 border-[#B4FF39]/25 bg-[#B4FF39]/10 text-xs text-[#B4FF39] hover:bg-[#B4FF39]/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add market
          </Button>
          <Button
            data-tour="mh-snapshot"
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
            {collecting ? 'Refreshing…' : 'Refresh Snapshots'}
          </Button>
        </div>
      </div>

      {collecting && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#B4FF39]/20 bg-[#B4FF39]/[0.04] px-3 py-2 text-xs text-white/80">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#B4FF39]" />
          Pulling fresh listings from eBay for every tracked market. This can take a minute;
          the board updates when it's done.
        </div>
      )}

      {showAdd && (
        <AddMarketForm
          onDone={() => { setShowAdd(false); load(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Scope tabs + market drill-down */}
      <div data-tour="mh-scope" className="mb-4 flex flex-wrap items-center gap-2">
        <InfoTip>
          Choose what to look at: whole markets like Pokémon, sets, players and characters
          like LeBron or Charizard, or single cards. The dropdown narrows it to one market,
          and “All” shows everything.
        </InfoTip>
        <div className="inline-flex rounded-md border border-white/10 bg-black/40 p-0.5">
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
        <select
          value={market}
          onChange={e => setMarket(e.target.value)}
          className="h-8 rounded-md border border-white/10 bg-black/40 px-2 text-xs text-white/80 outline-none hover:bg-white/5 focus:border-white/20"
        >
          {MARKETS.map(m => (
            <option key={m.k} value={m.k} className="bg-[#161616]">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Movers strip */}
      {loading && stale ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[24, 20, 28, 18, 22].map((w, i) => (
            <Skeleton key={i} className="h-6 rounded-full bg-white/5" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      ) : movers.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            movers
            <InfoTip>
              The biggest jumps in heat since the last snapshot, in points on the same 0 to 100
              record scale. Green is heating up fastest, red is cooling off fastest.
            </InfoTip>
          </span>
          {movers.map(m => {
            const change = toHeatIndexDelta(m.heatChange, scale) ?? 0;
            const up = change >= 0;
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
                  {change}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* What 100 means — the all-time record the index is scaled to */}
      {scale && rows.length > 0 && !(loading && stale) && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3 w-3 text-[#B4FF39]" />
            <span className="font-semibold text-[#B4FF39]">100</span> = our all-time record
            <span className="text-white/60">({recordHolder(scale)})</span>
          </span>
          <span>
            <span className="font-semibold text-red-300">0</span> = the coldest we've seen
          </span>
          <InfoTip>
            Heat is scaled against every reading we've ever taken ({scale.readings.toLocaleString()}{' '}
            so far, across all markets, sets, players and cards). The hottest one sets 100, and
            a new record moves the top of the scale. The tick on each bar marks that market's
            own high.
          </InfoTip>
        </div>
      )}

      {/* Leaderboard */}
      {loading && (stale || rows.length === 0) ? (
        <HeatRowsSkeleton />
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No snapshots yet. Hit "Refresh Snapshots" to grab the first one.
        </div>
      ) : (
        <div
          data-tour="mh-rows"
          aria-busy={busy}
          className={`space-y-2 transition-opacity ${busy ? 'pointer-events-none opacity-60' : ''}`}
        >
          {rows.map(r => {
            const idx = toHeatIndex(r.heatScore, scale);
            const peak = toHeatIndex(r.peakHeat, scale);
            const isRecord = scale != null && r.heatScore != null && r.heatScore >= scale.ceiling;
            // "At its high" only means something once there's some history to beat.
            const atOwnHigh =
              !isRecord &&
              (r.scoredReadings ?? 0) >= 5 &&
              r.heatScore != null &&
              r.peakHeat != null &&
              r.heatScore >= r.peakHeat;
            return (
            <div
              key={r.segment}
              className="group rounded-lg border border-white/8 bg-black/20 p-3"
            >
              <div
                className={`flex items-center gap-3 ${editingKey === r.segment ? '' : 'cursor-pointer'}`}
                onClick={() => {
                  if (editingKey !== r.segment)
                    setExpandedKey(k => (k === r.segment ? null : r.segment));
                }}
              >
                {/* Heat score dial */}
                <div className="w-12 shrink-0 text-center">
                  {idx == null ? (
                    <div className="mx-auto w-fit rounded bg-white/5 px-1.5 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-white/60">
                      new
                    </div>
                  ) : (
                    <div
                      className="text-xl font-bold leading-none"
                      style={{ color: heatColor(idx) }}
                    >
                      {idx}
                    </div>
                  )}
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    <TermTip
                      tip={
                        idx == null ? (
                          'Heat measures how a market is changing, so it needs two snapshots to compare. Listings and price are in now; the score fills in after the next snapshot.'
                        ) : scale ? (
                          <>
                            How hot this market is against our all-time record. 100 is the
                            hottest reading we've ever recorded ({recordHolder(scale)}) and 0 is
                            the coldest.
                            {peak != null && <> This market's own high is {peak}.</>} It's a
                            weighted mix of the sub-scores next to it. Raw score: {r.heatScore}.
                          </>
                        ) : (
                          'A 0 to 100 score for how hot this market is. It weighs where supply and prices are heading most, then how fast cards sell, how long they sit, buzz, and our own views and saves.'
                        )
                      }
                      side="right"
                    >
                      heat
                    </TermTip>
                  </div>
                </div>

                {editingKey === r.segment ? (
                  <RowEditor
                    row={r}
                    onDone={() => { setEditingKey(null); load(); }}
                    onCancel={() => setEditingKey(null)}
                  />
                ) : (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {r.scope === 'set' ? (
                      <Package className="h-3.5 w-3.5 text-white/40" />
                    ) : r.scope === 'card' ? (
                      <Tag className="h-3.5 w-3.5 text-white/40" />
                    ) : r.scope === 'player' ? (
                      <Users className="h-3.5 w-3.5 text-white/40" />
                    ) : null}
                    <span className="truncate font-medium text-white">
                      {r.label ?? r.segment}
                    </span>
                    {r.rootMarket && r.scope !== 'segment' && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/40">
                        {r.rootMarket.replace('_', ' ')}
                      </span>
                    )}
                    {isRecord ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-[#B4FF39]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#B4FF39]">
                        <Flame className="h-2.5 w-2.5" /> all-time record
                      </span>
                    ) : atOwnHigh ? (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/60">
                        at its high
                      </span>
                    ) : null}
                    <span className="ml-auto flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setEditingKey(r.segment); }}
                        className="rounded p-1 text-white/40 opacity-0 transition-opacity hover:text-[#B4FF39] group-hover:opacity-100"
                        title="Edit label / query"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); remove(r.segment, r.label); }}
                        disabled={removingKey === r.segment}
                        className={`rounded p-1 text-white/40 transition-opacity hover:text-red-400 group-hover:opacity-100 ${
                          removingKey === r.segment ? 'opacity-100' : 'opacity-0'
                        }`}
                        title="Stop tracking"
                      >
                        {removingKey === r.segment ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-white/30 transition-transform ${
                          expandedKey === r.segment ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  </div>
                  {/* Heat bar — full width = all-time record; tick = this market's own high */}
                  {idx == null ? (
                    <div className="mt-1 text-[11px] text-white/50">
                      Nothing to compare against yet. Its heat score shows up after the next
                      snapshot.
                    </div>
                  ) : (
                  <div className="relative mt-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(3, Math.min(100, idx ?? 0))}%`,
                          background: heatColor(idx),
                        }}
                      />
                    </div>
                    {idx != null && peak != null && peak > idx && (
                      <span
                        title={`Own high: ${peak}`}
                        className="absolute -top-0.5 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-white/60"
                        style={{ left: `${peak}%` }}
                      />
                    )}
                  </div>
                  )}
                  {/* Market size + price level */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {/* Cards show this as the "Listed" sub-score instead. */}
                    {!r.heatDrivers?.some(d => d.key === 'listed') && (
                      <span className="text-[11px] text-muted-foreground">
                        {(r.totalActive ?? 0).toLocaleString()}{' '}
                        <TermTip tip="How many listings are live for this market right now. This is eBay's full count, not the 200 we sample.">
                          listed
                        </TermTip>
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      <TermTip tip="The middle asking price across the listings we sampled.">
                        ask
                      </TermTip>{' '}
                      {money(r.medianAskUsd)}
                    </span>
                    {/* With sub-scores, buzz lives in the grid below. */}
                    {!r.heatDrivers && r.extra?.social?.mentions != null && (
                      <span className="text-[11px] text-muted-foreground">
                        <TermTip tip="How much people are talking about this market lately on Reddit, YouTube, and Bluesky.">
                          buzz
                        </TermTip>{' '}
                        {r.extra.social.mentions}
                      </span>
                    )}
                  </div>
                  {/* Sub-scores: what's driving the heat */}
                  {r.heatDrivers && <DriverGrid row={r} drivers={r.heatDrivers} />}
                  {/* First-party attention (our platform's views + saves) */}
                  {engagement[r.segment] && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#B4FF39]/80">
                        <Eye className="h-3 w-3" />
                        {(engagement[r.segment].totalViews ?? 0).toLocaleString()}{' '}
                        <TermTip tip="Views on our own shop items that match this market, counted once per viewer per day. This is our data, not eBay's.">
                          views
                        </TermTip>
                      </span>
                      <Momentum label="" value={engagement[r.segment].viewsChangePct} />
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#B4FF39]/80">
                        <Star className="h-3 w-3" />
                        {(engagement[r.segment].totalWatchers ?? 0).toLocaleString()}{' '}
                        <TermTip tip="How many people have saved our matching shop items. It's a direct read on how interested our own audience is.">
                          saves
                        </TermTip>
                      </span>
                      {engagement[r.segment].newViews7d > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {engagement[r.segment].newViews7d} views/7d
                        </span>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
              {expandedKey === r.segment && editingKey !== r.segment && (
                <MarketTrendChart segment={r.segment} label={r.label} scale={scale} />
              )}
            </div>
            );
          })}
          <p className="pt-1 text-[11px] text-muted-foreground/70">
            Click any row for its trend over time (peaks &amp; troughs). The sub-scores under
            each market show what's driving its heat, and the small % is how much each one
            counts. Price and supply are the steadiest; sell-through and freshness firm up as
            daily snapshots accrue.{' '}
            <span className="text-[#B4FF39]/70">Green</span> = our platform's own attention
            (views/saves).
          </p>
        </div>
      )}
    </Card>
  );
};
