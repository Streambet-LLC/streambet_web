import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { BuyerFeeTerms, HermesShell, MarketSearch } from '@/components/hermes/HermesShell';
import { IS_HERMES_SITE } from '@/components/hermes/site';
import { AuctionCard } from '@/components/hermes/AuctionCard';
import { CATEGORIES, CATEGORY_LABEL, fmtFeeTiers, fmtUsd } from '@/components/hermes/format';
import { useBuyerFeeRates, useHermesConfig } from '@/components/hermes/useHermesConfig';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AuctionCategory,
  MarketBucket,
  MarketQuery,
  MarketSort,
  hermesAPI,
} from '@/integrations/api/hermes';

const PAGE_SIZE = 24;
const TABS: Array<{ key: MarketBucket; label: string }> = [
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ended', label: 'Ended' },
];
const SORTS: MarketSort[] = ['ending', 'newest', 'price_asc', 'price_desc', 'bids'];

function sortLabel(sort: MarketSort, tab: MarketBucket): string {
  switch (sort) {
    case 'ending':
      return tab === 'upcoming'
        ? 'Starting soonest'
        : tab === 'ended'
          ? 'Recently ended'
          : 'Ending soonest';
    case 'newest':
      return 'Newly listed';
    case 'price_asc':
      return 'Price: low to high';
    case 'price_desc':
      return 'Price: high to low';
    case 'bids':
      return 'Most bids';
  }
}

function money(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Filters live in the URL so searches are linkable and survive reloads. */
function useMarketFilters() {
  const [params, setParams] = useSearchParams();
  const tabRaw = params.get('tab');
  const catRaw = params.get('cat');
  const sortRaw = params.get('sort');
  const payRaw = params.get('pay');
  const filters = {
    tab: (TABS.some(t => t.key === tabRaw) ? tabRaw : 'live') as MarketBucket,
    q: (params.get('q') ?? '').trim(),
    category: (CATEGORIES as string[]).includes(catRaw ?? '')
      ? (catRaw as AuctionCategory)
      : undefined,
    sort: (SORTS as string[]).includes(sortRaw ?? '') ? (sortRaw as MarketSort) : 'ending',
    min: money(params.get('min')),
    max: money(params.get('max')),
    pay: (payRaw === 'fiat' || payRaw === 'crypto' ? payRaw : undefined) as
      | 'fiat'
      | 'crypto'
      | undefined,
  };
  const update = (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    setParams(next, { replace: true });
  };
  return { filters, update };
}

/**
 * Hermes Auctions marketplace — the buyer home page (`/`): the first tab on
 * collectiqapp.xyz, and the whole standalone Hermes site. Search, Live / Upcoming / Ended,
 * sort, and category / price / payment filters, with "load more" paging.
 */
export default function AuctionsHome() {
  const { filters, update } = useMarketFilters();
  const { tab, q, category, sort, min, max, pay } = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const feeRates = useBuyerFeeRates();

  const query: MarketQuery = {
    bucket: tab,
    q: q || undefined,
    category,
    sort,
    minPrice: min,
    maxPrice: max,
    payment: pay,
  };
  const market = useInfiniteQuery({
    queryKey: ['hermes-market', query],
    queryFn: ({ pageParam }) => hermesAPI.search({ ...query, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.rows.length, 0);
      return loaded < last.total && last.rows.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
    refetchInterval: tab === 'live' ? 30_000 : false,
  });

  // Offset pages can overlap when live prices reorder between fetches.
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (market.data?.pages ?? [])
      .flatMap(p => p.rows)
      .filter(a => (seen.has(a.id) ? false : (seen.add(a.id), true)));
  }, [market.data]);
  const total = market.data?.pages[0]?.total ?? 0;

  const narrowed = !!(q || category || min != null || max != null || pay);
  const clearAll = () =>
    update({ q: undefined, cat: undefined, min: undefined, max: undefined, pay: undefined });

  const pills: Array<{ key: string; label: string; clear: () => void }> = [];
  if (q) pills.push({ key: 'q', label: `“${q}”`, clear: () => update({ q: undefined }) });
  if (category)
    pills.push({
      key: 'cat',
      label: CATEGORY_LABEL[category],
      clear: () => update({ cat: undefined }),
    });
  if (min != null || max != null)
    pills.push({
      key: 'price',
      label:
        min != null && max != null
          ? `${fmtUsd(min)} – ${fmtUsd(max)}`
          : min != null
            ? `${fmtUsd(min)}+`
            : `Up to ${fmtUsd(max)}`,
      clear: () => update({ min: undefined, max: undefined }),
    });
  if (pay)
    pills.push({
      key: 'pay',
      label: pay === 'crypto' ? 'Takes USDC' : 'Takes card & bank',
      clear: () => update({ pay: undefined }),
    });

  return (
    <HermesShell wide>
      {/* The header search shows from md (Hermes site) / lg (collectiqapp.xyz, which also has tabs). */}
      <MarketSearch className={`mb-4 flex ${IS_HERMES_SITE ? 'md:hidden' : 'lg:hidden'}`} />

      {!narrowed && (
        <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#C7FA09]/15 via-[#141414] to-[#0a0a0a] px-5 py-5 sm:px-8 sm:py-8">
          {!IS_HERMES_SITE && (
            // On collectiqapp.xyz the header carries collectIQ, so the brand lives here.
            <img
              src="/hermes/hermes-auctions-logo.png"
              alt="Hermes Auctions"
              className="mb-3 h-8 w-auto sm:h-10"
            />
          )}
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C7FA09] sm:text-xs sm:tracking-[0.25em]">
            Zero-seller-fee collectibles auctions
          </p>
          <h1 className="mt-2 max-w-4xl text-xl font-black italic uppercase leading-tight sm:text-4xl">
            Bid on the cards & memorabilia you chase.
          </h1>
          <p className="mt-2 text-xs text-white/60 sm:hidden">
            Buyer fee {fmtFeeTiers(feeRates)} · all bids are final
          </p>
          <p className="mt-2 hidden max-w-2xl text-sm text-white/65 sm:block">
            <BuyerFeeTerms />
          </p>
        </section>
      )}

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24">
            <FilterPanel filters={filters} update={update} onClear={clearAll} narrowed={narrowed} />
          </div>
        </aside>

        <section aria-label="Auctions" className="min-w-0">
          {/* Toolbar: tabs · count · sort */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex rounded-full border border-white/10 bg-black/40 p-1"
              role="group"
              aria-label="Auction status"
            >
              {TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={tab === t.key}
                  onClick={() =>
                    update({ tab: t.key === 'live' ? undefined : t.key, sort: undefined })
                  }
                  className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition sm:px-4 ${
                    tab === t.key ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-white/55" aria-live="polite">
              {market.isLoading
                ? 'Loading…'
                : `${total.toLocaleString()} ${total === 1 ? 'lot' : 'lots'}`}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen(o => !o)}
                aria-expanded={filtersOpen}
                aria-controls="market-filters-mobile"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-sm font-semibold text-white/80 hover:border-white/35 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {pills.filter(p => p.key !== 'q').length > 0 && (
                  <span className="rounded-full bg-[#C7FA09] px-1.5 text-[11px] font-bold text-black">
                    {pills.filter(p => p.key !== 'q').length}
                  </span>
                )}
              </button>
              <label className="sr-only" htmlFor="market-sort">
                Sort by
              </label>
              <div className="relative">
                {/* Native arrow hugs the pill's edge; draw our own inside the padding. */}
                <select
                  id="market-sort"
                  value={sort}
                  onChange={e =>
                    update({ sort: e.target.value === 'ending' ? undefined : e.target.value })
                  }
                  className="h-9 cursor-pointer appearance-none rounded-full border border-white/15 bg-black/40 pl-3.5 pr-9 text-sm font-semibold text-white focus:border-[#C7FA09]/60 focus:outline-none [&>option]:bg-[#141414]"
                >
                  {SORTS.map(s => (
                    <option key={s} value={s}>
                      {sortLabel(s, tab)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          {/* Mobile / tablet: categories inline, the rest behind "Filters" */}
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
            <CategoryChip active={!category} onClick={() => update({ cat: undefined })}>
              All
            </CategoryChip>
            {CATEGORIES.map(c => (
              <CategoryChip key={c} active={category === c} onClick={() => update({ cat: c })}>
                {CATEGORY_LABEL[c]}
              </CategoryChip>
            ))}
          </div>
          {filtersOpen && (
            <div
              id="market-filters-mobile"
              className="mt-3 rounded-2xl border border-white/10 bg-[#141414] p-4 lg:hidden"
            >
              <FilterPanel
                filters={filters}
                update={update}
                onClear={clearAll}
                narrowed={narrowed}
                hideCategories
              />
            </div>
          )}

          {pills.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {pills.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={p.clear}
                  className="inline-flex items-center gap-1 rounded-full border border-[#C7FA09]/40 bg-[#C7FA09]/10 px-2.5 py-1 text-xs font-semibold text-[#C7FA09] hover:bg-[#C7FA09]/20"
                  aria-label={`Remove filter ${p.label}`}
                >
                  {p.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-white/55 underline-offset-2 hover:text-white hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="mt-5">
            {market.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/6] rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : market.isError ? (
              <p className="py-16 text-center text-white/60">
                Couldn't load auctions. Refresh to try again.
              </p>
            ) : rows.length === 0 ? (
              <EmptyState
                tab={tab}
                narrowed={narrowed}
                onClear={clearAll}
                onUpcoming={() => update({ tab: 'upcoming', sort: undefined })}
              />
            ) : (
              <>
                <div
                  className={`grid grid-cols-2 gap-3 transition-opacity sm:gap-4 md:grid-cols-3 xl:grid-cols-4 ${
                    market.isPlaceholderData ? 'opacity-60' : ''
                  }`}
                >
                  {rows.map(a => (
                    <AuctionCard key={a.id} auction={a} />
                  ))}
                </div>
                <div className="mt-8 flex flex-col items-center gap-2">
                  {total > rows.length && (
                    <p className="text-xs text-white/45">
                      Showing {rows.length} of {total.toLocaleString()}
                    </p>
                  )}
                  {market.hasNextPage && (
                    <button
                      type="button"
                      onClick={() => market.fetchNextPage()}
                      disabled={market.isFetchingNextPage}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-bold text-white hover:border-[#C7FA09]/60 disabled:opacity-50"
                    >
                      {market.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                      Load more
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </HermesShell>
  );
}

type Filters = ReturnType<typeof useMarketFilters>['filters'];
type Update = ReturnType<typeof useMarketFilters>['update'];

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? 'border-[#C7FA09] bg-[#C7FA09] text-black'
          : 'border-white/15 text-white/75 hover:border-white/35'
      }`}
    >
      {children}
    </button>
  );
}

/** Category, price and payment filters (sidebar on desktop, panel on mobile). */
function FilterPanel({
  filters,
  update,
  onClear,
  narrowed,
  hideCategories,
}: {
  filters: Filters;
  update: Update;
  onClear: () => void;
  narrowed: boolean;
  hideCategories?: boolean;
}) {
  const config = useHermesConfig();
  const usdcLive = !!config.data?.crypto?.enabled;
  const [minDraft, setMinDraft] = useState(filters.min != null ? String(filters.min) : '');
  const [maxDraft, setMaxDraft] = useState(filters.max != null ? String(filters.max) : '');
  useEffect(() => setMinDraft(filters.min != null ? String(filters.min) : ''), [filters.min]);
  useEffect(() => setMaxDraft(filters.max != null ? String(filters.max) : ''), [filters.max]);

  const commitPrice = () => {
    let lo = money(minDraft);
    let hi = money(maxDraft);
    if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
    if (lo !== filters.min || hi !== filters.max) update({ min: lo, max: hi });
  };
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitPrice();
  };

  const option = (active: boolean) =>
    `flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
      active
        ? 'bg-white/10 font-semibold text-white'
        : 'text-white/65 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <div className="space-y-6">
      {!hideCategories && (
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">
            Category
          </legend>
          <div className="space-y-0.5">
            <button
              type="button"
              aria-pressed={!filters.category}
              onClick={() => update({ cat: undefined })}
              className={option(!filters.category)}
            >
              All categories
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                type="button"
                aria-pressed={filters.category === c}
                onClick={() => update({ cat: c })}
                className={option(filters.category === c)}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">
          {filters.tab === 'ended' ? 'Final price' : 'Current bid'}
        </legend>
        <div className="flex items-center gap-2">
          <PriceInput
            label="Minimum price"
            placeholder="Min"
            value={minDraft}
            onChange={setMinDraft}
            onBlur={commitPrice}
            onKeyDown={onEnter}
          />
          <span className="text-white/35">–</span>
          <PriceInput
            label="Maximum price"
            placeholder="Max"
            value={maxDraft}
            onChange={setMaxDraft}
            onBlur={commitPrice}
            onKeyDown={onEnter}
          />
        </div>
      </fieldset>

      {usdcLive && (
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">
            Pay with
          </legend>
          <div className="space-y-0.5">
            {(
              [
                [undefined, 'Any'],
                ['fiat', 'Card or bank'],
                ['crypto', 'USDC'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={filters.pay === key}
                onClick={() => update({ pay: key })}
                className={option(filters.pay === key)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {narrowed && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-semibold text-[#C7FA09] underline-offset-2 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function PriceInput({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onKeyDown,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/40">
        $
      </span>
      <input
        inputMode="decimal"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-lg border border-white/10 bg-black/40 pl-6 pr-2 text-sm text-white placeholder:text-white/35 focus:border-[#C7FA09]/60 focus:outline-none"
      />
    </div>
  );
}

function EmptyState({
  tab,
  narrowed,
  onClear,
  onUpcoming,
}: {
  tab: MarketBucket;
  narrowed: boolean;
  onClear: () => void;
  onUpcoming: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 px-4 py-16 text-center">
      <img src="/hermes/hermes-mark-64.png" alt="" className="mx-auto h-14 w-14 opacity-80" />
      {narrowed ? (
        <>
          <p className="mt-3 font-semibold">No lots match your search.</p>
          <button type="button" className="mt-1 text-sm text-[#C7FA09] underline" onClick={onClear}>
            Clear filters
          </button>
        </>
      ) : tab === 'live' ? (
        <>
          <p className="mt-3 font-semibold">No live auctions right now.</p>
          <p className="mt-1 text-sm text-white/55">
            Check{' '}
            <button type="button" className="text-[#C7FA09] underline" onClick={onUpcoming}>
              upcoming lots
            </button>
            .
          </p>
        </>
      ) : tab === 'upcoming' ? (
        <>
          <p className="mt-3 font-semibold">Nothing scheduled yet.</p>
          <p className="mt-1 text-sm text-white/55">New lots drop regularly.</p>
        </>
      ) : (
        <p className="mt-3 font-semibold">No results yet.</p>
      )}
    </div>
  );
}
