import React from 'react';
import FeaturedBetCard from '@/components/FeaturedBetCard';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { getThumbnailUrl } from '@/utils/helper';

export type PrizeCategoryType = 'slab' | 'sealed';

export interface Prize {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: PrizeCategoryType;
  amount?: number;
  stock?: number;
}

interface PrizesByCategoryProps {
  prizes: Prize[];
  onPrizeClick?: (prize: Prize) => void;
}

const CATEGORY_LABELS: Record<PrizeCategoryType, string> = {
  slab: 'Slabs',
  sealed: 'Sealed Product',
};

export const PrizesByCategory: React.FC<PrizesByCategoryProps> = ({ prizes, onPrizeClick }) => {
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

  return (
    <div className="space-y-8">
      {hasPrizes ? (
        Object.entries(categories).map(([key, items]) =>
          items.length > 0 ? (
            <div key={key}>
              <h2 className="text-2xl font-bold mb-4">
                {CATEGORY_LABELS[key as PrizeCategoryType]}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {items.map(prize => (
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
                        <p className="text-sm text-muted-foreground mb-2">{prize.description}</p>
                      )}
                      {typeof prize.amount === 'number' && (
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
                      <Button
                        className="mt-auto w-full gap-2"
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
          None Available
        </div>
      )}
    </div>
  );
};
