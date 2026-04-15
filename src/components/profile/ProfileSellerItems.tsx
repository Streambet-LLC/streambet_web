import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Link } from 'react-router-dom';
import { resolvePrizeImages } from '@/components/prizes/prizeImageUtils';
import { Prize as PrizeDisplay } from '@/components/prizes/PrizesByCategory';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';
import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Star, Store, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getThumbnailUrl } from '@/utils/helper';
import FeaturedItemsModal from './FeaturedItemsModal';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

interface ProfileSellerItemsProps {
  username: string;
  isOwnProfile: boolean;
  isProSubscriber: boolean;
}

export default function ProfileSellerItems({
  username,
  isOwnProfile,
  isProSubscriber,
}: ProfileSellerItemsProps) {
  const { session } = useAuthContext();
  const [selectedPrizeForCheckout, setSelectedPrizeForCheckout] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);

  const { data: shopData, isLoading } = useQuery({
    queryKey: ['profile-seller-items', username],
    queryFn: async () => {
      return await api.prize.getShopItemsByUsername(username);
    },
    staleTime: 5 * 60 * 1000,
  });

  const userCadeCoins = session?.walletBalanceCadeCoin || 0;

  // Build prize display items
  let allItems: PrizeDisplay[] = (shopData?.items || [])
    .filter(
      prize =>
        (prize.category === 'slab' || prize.category === 'sealed') &&
        prize.stock > 0 &&
        prize.showOnShop !== false
    )
    .map(prize => {
      const { imageUrls, coverImageIndex, coverImageUrl } = resolvePrizeImages(prize);

      return {
        id: prize.id,
        name: prize.name,
        description: prize.description || undefined,
        imageUrl: coverImageUrl,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        coverImageIndex,
        category: prize.category as 'slab' | 'sealed',
        amount: typeof prize.amount === 'number' && !isNaN(prize.amount) ? prize.amount : 0,
        stock: prize.stock,
        purchaseOption: prize.purchaseOption,
        brand: prize.brand,
        displayOrder: prize.sellerDisplayOrderShop ?? prize.displayOrderShop ?? 999,
        createdBy: prize.createdBy ?? null,
        isProOnly: prize.isProOnly ?? false,
        proEarlyAccessUntil: prize.proEarlyAccessUntil ?? null,
        featuredDisplayOrder: prize.profileFeatured ? 1 : null,
      };
    });

  // Determine which items to display on the profile:
  // - If seller has explicitly featured any items, show ONLY those
  // - If PRO but no explicit picks, auto-feature up to 5
  // - Non-PRO: show all items (no featured distinction)
  // The full catalog is accessible via "View Full Shop →"
  const explicitlyFeatured = allItems.filter(item => item.featuredDisplayOrder !== null);
  const hasExplicitFeatured = explicitlyFeatured.length > 0;

  let displayItems: PrizeDisplay[];
  let featuredIds: Set<string>;

  if (hasExplicitFeatured) {
    // Seller has explicitly chosen featured items — show only those
    displayItems = [...explicitlyFeatured].sort(
      (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
    );
    featuredIds = new Set(displayItems.map(i => i.id));
  } else if (isProSubscriber) {
    // PRO seller with no explicit picks — auto-feature first 5
    const sorted = [...allItems].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
    displayItems = sorted.slice(0, 5);
    featuredIds = new Set(displayItems.map(i => i.id));
  } else {
    // Non-PRO: show all items, no featured badges
    displayItems = [...allItems].sort(
      (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
    );
    featuredIds = new Set();
  }

  if (isLoading) {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Store className="w-5 h-5" />
          Shop Items
        </h2>
        <div className="text-center py-6 text-muted-foreground text-sm">Loading items...</div>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return null;
  }

  const ItemCarousel = ({
    items,
    featuredIds,
    onItemClick,
  }: {
    items: PrizeDisplay[];
    featuredIds?: Set<string>;
    onItemClick: (prize: PrizeDisplay) => void;
  }) => (
    <Carousel
      opts={{ align: 'start', loop: false, skipSnaps: true }}
      className="w-full"
    >
      <CarouselContent className="-ml-3">
        {items.map(item => {
          const imageUrl = item.imageUrls?.[item.coverImageIndex ?? 0] || item.imageUrl || null;
          const isFeatured = featuredIds?.has(item.id) ?? false;
          return (
            <CarouselItem
              key={item.id}
              className="pl-3 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            >
              <Card
                className={`bg-[#181A20] border rounded-lg overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group ${
                  isFeatured ? 'border-yellow-400/40' : 'border-[#23272F]'
                }`}
                onClick={() => onItemClick(item)}
              >
                <div className="aspect-[3/4] relative overflow-hidden bg-[#0D0D0D]">
                  {imageUrl ? (
                    <img
                      src={getThumbnailUrl(imageUrl)}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Store className="w-8 h-8" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
                    {isFeatured && (
                      <span className="bg-black/70 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-yellow-400" /> Featured
                      </span>
                    )}
                    {item.isProOnly && (
                      <span className="bg-black/70 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        👑 Pro
                      </span>
                    )}
                  </div>
                </div>
                <CardContent className="p-2.5">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  {item.amount != null && item.amount > 0 && (
                    <p className="text-[11px] text-primary font-semibold mt-0.5">
                      ${(item.amount / 100).toFixed(2)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      {items.length > 3 && (
        <>
          <CarouselPrevious className="-left-3 bg-[#181A20] border-[#23272F] hover:bg-[#23272F]" />
          <CarouselNext className="-right-3 bg-[#181A20] border-[#23272F] hover:bg-[#23272F]" />
        </>
      )}
    </Carousel>
  );

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Store className="w-5 h-5" />
          Shop Items
          <span className="text-sm font-normal text-muted-foreground">
            ({displayItems.length})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {isOwnProfile && isProSubscriber && (
            <button
              type="button"
              onClick={() => setShowFeaturedModal(true)}
              className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5" />
              Featured
            </button>
          )}
          <Link
            to={`/shop/${username}`}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            View Full Shop →
          </Link>
        </div>
      </div>

      {/* All Items in a single carousel — featured first with badge */}
      <ItemCarousel
        items={displayItems}
        featuredIds={featuredIds}
        onItemClick={prize =>
          setSelectedPrizeForCheckout({
            id: prize.id,
            name: prize.name,
            amount: prize.amount ?? 0,
          })
        }
      />

      {/* Checkout Modal */}
      {selectedPrizeForCheckout && (
        <PrizeCheckoutModal
          isOpen={!!selectedPrizeForCheckout}
          onClose={() => setSelectedPrizeForCheckout(null)}
          prizeId={selectedPrizeForCheckout.id}
          prizeName={selectedPrizeForCheckout.name}
          prizeAmount={selectedPrizeForCheckout.amount}
          userCadeCoins={userCadeCoins}
          allowCadeCoins={false}
          isShopItem={true}
        />
      )}

      {/* Featured Items Management Modal */}
      {isOwnProfile && isProSubscriber && (
        <FeaturedItemsModal
          open={showFeaturedModal}
          onClose={() => setShowFeaturedModal(false)}
        />
      )}
    </div>
  );
}
