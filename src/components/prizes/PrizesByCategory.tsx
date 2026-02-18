import React, { useState } from 'react';
import FeaturedBetCard from '@/components/FeaturedBetCard';
import { Button } from '@/components/ui/button';
import { ShoppingCart, DollarSign } from 'lucide-react';
import { getThumbnailUrl } from '@/utils/helper';
import { MakeOfferModal } from './MakeOfferModal';

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
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);

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
                      <div className="flex flex-col sm:flex-row gap-2 mt-auto">
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
