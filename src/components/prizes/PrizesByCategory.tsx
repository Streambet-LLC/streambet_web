import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { MakeOfferModal } from './MakeOfferModal';
import { PrizeBrand, PrizeSaleType, AuctionSummary } from '@/types/prize';
import PrizeCard from './PrizeCard';
import AuctionCard from './AuctionCard';

export type PrizeCategoryType = 'raw' | 'slab' | 'sealed' | 'other';

export interface Prize {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  coverImageIndex?: number;
  category: PrizeCategoryType;
  grade?: string | null;
  amount?: number;
  stock?: number;
  purchaseOption?: 'offers_only' | 'buy_only' | 'both';
  brand?: PrizeBrand;
  displayOrder?: number;
  featuredDisplayOrder?: number | null;
  createdBy?: string | null;
  createdByUsername?: string | null;
  createdByShopName?: string | null;
  sellerDisplayName?: string | null;
  sellerCryptoEnabled?: boolean;
  isProOnly?: boolean;
  proEarlyAccessUntil?: string | null;
  viewCount?: number;
  watcherCount?: number;
  isWatching?: boolean;
  ebayMarketLastCalculatedAt?: string | null;
  showEbayAvgPublicly?: boolean;
  /** When set to 'auction', render AuctionCard and use the `auction` field. */
  saleType?: PrizeSaleType;
  /** Live auction summary; required when saleType === 'auction'. */
  auction?: AuctionSummary | null;
  /** Per-item shipping fee in USD. Forwarded into the checkout modal. */
  shippingCostUsd?: number;
  /** When true, item is in-person pickup (forces $0 shipping, hides address). */
  isInPerson?: boolean;
}

interface PrizesByCategoryProps {
  prizes: Prize[];
  onPrizeClick?: (prize: Prize) => void;
  selectedBrand?: PrizeBrand | null;
  onBrandChange?: (brand: PrizeBrand | null) => void;
  showFilters?: boolean; // Optional: if false, hide all filters
  showCategoryHeaders?: boolean; // Optional: if false, hide category headers
  showBrandFilter?: boolean; // Optional: if false, hide brand filter but keep price filter
  /** 'shop' = stag-style 4-col portrait cards (default); 'redemption' = prod-style 3-col landscape cards */
  cardVariant?: 'shop' | 'redemption';
  searchNode?: React.ReactNode; // Optional: custom search or filter component to render after filters
}

const CATEGORY_LABELS: Record<PrizeCategoryType, string> = {
  slab: 'Slabs',
  sealed: 'Sealed Product',
  raw: 'Raw',
  other: 'Other',
};

export const PrizesByCategory: React.FC<PrizesByCategoryProps> = ({
  prizes,
  onPrizeClick,
  selectedBrand,
  onBrandChange,
  showFilters = true, // Default to true to maintain existing behavior
  showCategoryHeaders = true, // Default to true to maintain existing behavior
  showBrandFilter = true, // Default to true to maintain existing behavior
  cardVariant = 'shop',
  searchNode,
}) => {
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [minViews, setMinViews] = useState<number | ''>('');
  const [minWatchers, setMinWatchers] = useState<number | ''>('');
  const [showPriceFilter, setShowPriceFilter] = useState(true);
  const [saleTypeFilter, setSaleTypeFilter] = useState<'all' | 'fixed_price' | 'auction'>('all');

  // Direct-link highlight: when a share URL like `?highlight=<itemId>`
  // is present, scroll the matching card into view and pulse its border
  // for a few seconds so the user can spot it.
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedItemId = searchParams.get('highlight');
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!highlightedItemId) return;
    // Defer to allow images / cards to mount + lay out before scrolling.
    const timer = window.setTimeout(() => {
      highlightedRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 200);
    // Strip the highlight param after the pulse animation finishes so a
    // page refresh / reshare doesn't keep replaying it indefinitely.
    const cleanup = window.setTimeout(() => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.delete('highlight');
          return next;
        },
        { replace: true }
      );
    }, 4000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(cleanup);
    };
    // We intentionally only re-run when the highlighted id changes;
    // setSearchParams is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedItemId]);

  const categories: Record<PrizeCategoryType, Prize[]> = {
    slab: [],
    sealed: [],
    raw: [],
    other: [],
  };

  prizes.forEach(prize => {
    if (
      prize.category === 'raw' ||
      prize.category === 'slab' ||
      prize.category === 'sealed' ||
      prize.category === 'other'
    ) {
      categories[prize.category].push(prize);
    }
  });

  const hasPrizes = Object.values(categories).some(items => items.length > 0);

  // Sort prizes by purchaseOption: 'both' first, then 'buy_only', then 'offers_only'
  const sortPrizesByPurchaseOption = (prizeList: Prize[]) => {
    const purchaseOptionOrder: Record<string, number> = {
      both: 0,
      buy_only: 1,
      offers_only: 2,
    };

    return [...prizeList].sort((a, b) => {
      const aOrder = purchaseOptionOrder[a.purchaseOption || 'both'] ?? 3;
      const bOrder = purchaseOptionOrder[b.purchaseOption || 'both'] ?? 3;
      return aOrder - bOrder;
    });
  };

  /**
   * Surface auctions first within each category so shoppers immediately
   * see live time-bound listings on a shop page. Active auctions float
   * above scheduled (not-yet-started) ones, which float above any
   * terminal-state auctions; fixed-price items keep their existing
   * display order behind that. Stable: items in the same priority
   * bucket retain their incoming order.
   */
  const surfaceAuctionsFirst = (prizeList: Prize[]) => {
    const priority = (p: Prize): number => {
      if (p.saleType !== 'auction' || !p.auction) return 3;
      const status = p.auction.status;
      const endsAt = new Date(p.auction.endsAt).getTime();
      if (status === 'active' && endsAt > Date.now()) return 0;
      if (status === 'scheduled') return 1;
      return 2; // ended/paid/unsold/failed/cancelled
    };
    return [...prizeList]
      .map((p, i) => ({ p, i, k: priority(p) }))
      .sort((a, b) => a.k - b.k || a.i - b.i)
      .map(({ p }) => p);
  };

  // Filter prizes by price range (filters by USD price)
  const filterByPriceRange = (prizeList: Prize[]) => {
    let filtered = prizeList;

    // Sale-type chip: all / fixed_price / auction.
    if (saleTypeFilter !== 'all') {
      filtered = filtered.filter(prize => {
        const effective = prize.saleType ?? 'fixed_price';
        return effective === saleTypeFilter;
      });
    }

    if (minPrice !== '' || maxPrice !== '') {
      filtered = filtered.filter(prize => {
        // Auction items don't have a fixed CadeCoin price, so they are
        // matched against the auction's current/starting USD bid.
        if (prize.saleType === 'auction' && prize.auction) {
          const usd = prize.auction.currentBidUsd ?? prize.auction.startingPriceUsd;
          const min = minPrice === '' ? 0 : minPrice;
          const max = maxPrice === '' ? Infinity : maxPrice;
          return usd >= min && usd <= max;
        }

        // Only show items with a buy price (not offers_only)
        if (prize.purchaseOption === 'offers_only' || !prize.amount) return false;

        // Convert CadeCoins to USD (50 coins = $1)
        const priceInUSD = prize.amount / 50;
        const min = minPrice === '' ? 0 : minPrice;
        const max = maxPrice === '' ? Infinity : maxPrice;

        return priceInUSD >= min && priceInUSD <= max;
      });
    }

    if (minViews !== '' && typeof minViews === 'number') {
      filtered = filtered.filter(prize => (prize.viewCount ?? 0) >= minViews);
    }

    if (minWatchers !== '' && typeof minWatchers === 'number') {
      filtered = filtered.filter(prize => (prize.watcherCount ?? 0) >= minWatchers);
    }

    return filtered;
  };

  return (
    <div className="space-y-8">
      {/* Filters - Only show if showFilters is true */}
      {showFilters && (
        <>
          {/* Filters Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (hasPrizes) {
                setShowPriceFilter(!showPriceFilter);
              } else {
                setShowPriceFilter(true);
              }
            }}
            disabled={hasPrizes === false}
            className="flex items-center gap-2"
          >
            {showPriceFilter || hasPrizes === false ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Filters
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show Filters
              </>
            )}
          </Button>

          {(showPriceFilter || hasPrizes === false) && (
            <div className="bg-secondary/50 p-4 rounded-lg space-y-4">
              {showBrandFilter && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Filter by Card Type:</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedBrand === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onBrandChange?.(null)}
                      className="rounded-full"
                    >
                      All Items
                    </Button>
                    <Button
                      variant={selectedBrand === 'pokemon' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onBrandChange?.('pokemon')}
                      className="rounded-full"
                    >
                      Pokémon
                    </Button>
                    <Button
                      variant={selectedBrand === 'one_piece' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onBrandChange?.('one_piece')}
                      className="rounded-full"
                    >
                      One Piece
                    </Button>
                    <Button
                      variant={selectedBrand === 'sports' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onBrandChange?.('sports')}
                      className="rounded-full"
                    >
                      Sports
                    </Button>
                    <Button
                      variant={selectedBrand === 'other' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onBrandChange?.('other')}
                      className="rounded-full"
                    >
                      Other
                    </Button>
                  </div>
                </div>
              )}

              {/* Price Range Filter */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Sale Type:</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant={saleTypeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSaleTypeFilter('all')}
                    className="rounded-full"
                  >
                    All
                  </Button>
                  <Button
                    variant={saleTypeFilter === 'fixed_price' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSaleTypeFilter('fixed_price')}
                    className="rounded-full"
                  >
                    Fixed Price
                  </Button>
                  <Button
                    variant={saleTypeFilter === 'auction' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSaleTypeFilter('auction')}
                    className="rounded-full"
                  >
                    Auctions
                  </Button>
                </div>
                <h3 className="text-sm font-semibold mb-3">Filter by Price (USD):</h3>
                <div className="flex gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="minPrice" className="text-xs text-muted-foreground">
                      Min
                    </label>
                    <Input
                      id="minPrice"
                      type="number"
                      placeholder="$0"
                      value={minPrice}
                      onChange={e => {
                        const val =
                          e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        setMinPrice(val);
                      }}
                      className="w-24"
                      min="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="maxPrice" className="text-xs text-muted-foreground">
                      Max
                    </label>
                    <Input
                      id="maxPrice"
                      type="number"
                      placeholder="∞"
                      value={maxPrice}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setMaxPrice(val);
                      }}
                      className="w-24"
                      min="0"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMinPrice('');
                      setMaxPrice('');
                    }}
                  >
                    Clear
                  </Button>
                </div>
                {minPrice !== '' &&
                  maxPrice !== '' &&
                  typeof maxPrice === 'number' &&
                  typeof minPrice === 'number' &&
                  maxPrice < minPrice && (
                    <p className="text-xs text-red-500 mt-2">Max should be greater than min</p>
                  )}
              </div>

              {/* Engagement Filters: min Views and min Watchers */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Filter by Engagement:</h3>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="minViews" className="text-xs text-muted-foreground">
                      Min Views
                    </label>
                    <Input
                      id="minViews"
                      type="number"
                      placeholder="0"
                      value={minViews}
                      onChange={e => {
                        const val =
                          e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        setMinViews(val);
                      }}
                      className="w-24"
                      min="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="minWatchers" className="text-xs text-muted-foreground">
                      Min Watchers
                    </label>
                    <Input
                      id="minWatchers"
                      type="number"
                      placeholder="0"
                      value={minWatchers}
                      onChange={e => {
                        const val =
                          e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        setMinWatchers(val);
                      }}
                      className="w-28"
                      min="0"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMinViews('');
                      setMinWatchers('');
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Custom search or filter node */}
      {searchNode && <div className="mb-6">{searchNode}</div>}

      {hasPrizes ? (
        (() => {
          const filteredItems = Object.values(categories).flatMap(items =>
            filterByPriceRange(items)
          );
          const hasFilteredResults = filteredItems.length > 0;

          return hasFilteredResults ? (
            Object.entries(categories).map(([key, items]) =>
              items.length > 0 ? (
                <div key={key}>
                  {showCategoryHeaders && (
                    <h2 className="text-4xl font-bold mb-8 py-6 flex items-center gap-2">
                      {CATEGORY_LABELS[key as PrizeCategoryType]}
                      {key === 'raw' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="bottom" align="start" className="max-w-xs text-sm">
                            Raw card conditions are labeled by the seller. Purchase at your own
                            risk!
                          </PopoverContent>
                        </Popover>
                      )}
                    </h2>
                  )}
                  <div
                    className={
                      cardVariant === 'redemption'
                        ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
                        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                    }
                  >
                    {surfaceAuctionsFirst(filterByPriceRange(items)).map(prize => {
                      const isHighlighted = highlightedItemId === prize.id;
                      return (
                        <div
                          key={prize.id}
                          id={`shop-item-${prize.id}`}
                          ref={isHighlighted ? highlightedRef : undefined}
                          className={
                            isHighlighted
                              ? 'rounded-2xl ring-4 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_24px_rgba(189,255,0,0.55)] transition-shadow animate-pulse'
                              : 'transition-shadow'
                          }
                        >
                          {prize.saleType === 'auction' && prize.auction ? (
                            <AuctionCard prize={prize as Prize & { auction: AuctionSummary }} />
                          ) : (
                            <PrizeCard
                              prize={prize}
                              variant={cardVariant}
                              onClick={onPrizeClick ? () => onPrizeClick(prize) : () => {}}
                              onOfferClick={prize => {
                                setSelectedPrize(prize);
                                setIsOfferModalOpen(true);
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-3xl text-muted-foreground">
              <span role="img" aria-label="cry smile sad" className="text-6xl mb-4"></span>
              No items match your filters
            </div>
          );
        })()
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-3xl text-muted-foreground">
          <span role="img" aria-label="cry smile sad" className="text-6xl mb-4"></span>
          None Available
        </div>
      )}

      {/* Make Offer Modal */}
      {selectedPrize && (
        <MakeOfferModal
          isOpen={isOfferModalOpen}
          onClose={() => {
            setIsOfferModalOpen(false);
            setSelectedPrize(null);
          }}
          prize={selectedPrize}
        />
      )}
    </div>
  );
};
