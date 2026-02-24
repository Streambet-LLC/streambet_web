import React, { useState } from 'react';
import FeaturedBetCard from '@/components/FeaturedBetCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { getThumbnailUrl } from '@/utils/helper';
import { MakeOfferModal } from './MakeOfferModal';
import { PrizeBrand } from '@/types/prize';

export type PrizeCategoryType = 'slab' | 'sealed';

export interface Prize {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: PrizeCategoryType;
  amount?: number;
  stock?: number;
  purchaseOption?: 'offers_only' | 'buy_only' | 'both';
  brand?: PrizeBrand;
}

interface PrizesByCategoryProps {
  prizes: Prize[];
  onPrizeClick?: (prize: Prize) => void;
  selectedBrand?: PrizeBrand | null;
  onBrandChange?: (brand: PrizeBrand | null) => void;
}

const CATEGORY_LABELS: Record<PrizeCategoryType, string> = {
  slab: 'Slabs',
  sealed: 'Sealed Product',
};

export const PrizesByCategory: React.FC<PrizesByCategoryProps> = ({
  prizes,
  onPrizeClick,
  selectedBrand,
  onBrandChange,
}) => {
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  const categories: Record<PrizeCategoryType, Prize[]> = {
    slab: [],
    sealed: [],
  };

  prizes.forEach(prize => {
    if (prize.category === 'slab' || prize.category === 'sealed') {
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

  // Filter prizes by price range (filters by USD price)
  const filterByPriceRange = (prizeList: Prize[]) => {
    // Only apply filter if at least one price is set
    if (minPrice === '' && maxPrice === '') return prizeList;

    return prizeList.filter(prize => {
      // Only show items with a buy price (not offers_only)
      if (prize.purchaseOption === 'offers_only' || !prize.amount) return false;

      // Convert CadeCoins to USD (50 coins = $1)
      const priceInUSD = prize.amount / 50;
      const min = minPrice === '' ? 0 : minPrice;
      const max = maxPrice === '' ? Infinity : maxPrice;

      return priceInUSD >= min && priceInUSD <= max;
    });
  };

  return (
    <div className="space-y-8">
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
          <div>
            <h3 className="text-sm font-semibold mb-3">Filter by Brand:</h3>
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

          {/* Price Range Filter */}
          <div>
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
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
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
                    if (
                      val === '' ||
                      (typeof val === 'number' && (minPrice === '' || val >= minPrice))
                    ) {
                      setMaxPrice(val);
                    }
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
          </div>
        </div>
      )}

      {hasPrizes ? (
        (() => {
          const filteredItems = Object.values(categories).flatMap(items =>
            filterByPriceRange(sortPrizesByPurchaseOption(items))
          );
          const hasFilteredResults = filteredItems.length > 0;

          return hasFilteredResults ? (
            Object.entries(categories).map(([key, items]) =>
              items.length > 0 ? (
                <div key={key}>
                  <h2 className="text-4xl font-bold mb-8 py-6">
                    {CATEGORY_LABELS[key as PrizeCategoryType]}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filterByPriceRange(sortPrizesByPurchaseOption(items)).map(prize => (
                      <FeaturedBetCard key={prize.id}>
                        <div className="p-6 flex flex-col h-full">
                          {prize.imageUrl && (
                            <div className="w-full aspect-[16/9] border-t pt-2 md:pt-4">
                              <img
                                src={getThumbnailUrl(prize.imageUrl)}
                                alt={prize.name}
                                className="w-full h-full rounded object-cover"
                              />
                            </div>
                          )}
                          <h3 className="font-semibold text-lg mb-1 mt-2">{prize.name}</h3>
                          {prize.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {prize.description}
                            </p>
                          )}
                          {typeof prize.amount === 'number' &&
                            prize.purchaseOption !== 'offers_only' && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {prize.amount.toLocaleString('en-US')} coins • $
                                {(prize.amount / 50).toFixed(2)} USD
                              </p>
                            )}
                          {typeof prize.stock === 'number' && (
                            <p className="text-xs text-muted-foreground mb-4">
                              Stock: {prize.stock} {prize.stock === 1 ? 'item' : 'items'}
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                            {prize.purchaseOption !== 'offers_only' && (
                              <Button
                                className="flex-1 gap-2"
                                type="button"
                                tabIndex={0}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (onPrizeClick) onPrizeClick(prize);
                                }}
                              >
                                <ShoppingCart className="w-4 h-4" />
                                Buy Now
                              </Button>
                            )}
                            {prize.purchaseOption !== 'buy_only' && (
                              <Button
                                variant="outline"
                                className="flex-1 gap-2 bg-transparent border-[#D4FF00] text-[#D4FF00] hover:bg-[#D4FF00]/10 hover:text-[#D4FF00]"
                                type="button"
                                tabIndex={0}
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedPrize(prize);
                                  setIsOfferModalOpen(true);
                                }}
                              >
                                <DollarSign className="w-4 h-4" />
                                Make Offer
                              </Button>
                            )}
                          </div>
                        </div>
                      </FeaturedBetCard>
                    ))}
                  </div>
                </div>
              ) : null
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-3xl text-muted-foreground">
              <span role="img" aria-label="cry smile sad" className="text-6xl mb-4">
                😢
              </span>
              No items match your filters
            </div>
          );
        })()
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-3xl text-muted-foreground">
          <span role="img" aria-label="cry smile sad" className="text-6xl mb-4">
            😢
          </span>
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
