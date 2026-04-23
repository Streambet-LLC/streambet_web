import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

import api from '@/integrations/api/client';
import { MainLayout } from '@/components/layout';
import { useAuthContext } from '@/contexts/AuthContext';
import { PrizesByCategory, type Prize } from '@/components/prizes/PrizesByCategory';
import { Button } from '@/components/ui/button';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';
import { useState } from 'react';

/**
 * Authenticated user's saved/watched items.
 *
 * Re-uses the same `PrizesByCategory` grid the rest of the shop uses so
 * the cards look identical (heart, view count, etc. all "just work").
 */
export default function Watchlist() {
  const { session, isLoading: isSessionLoading } = useAuthContext();
  const navigate = useNavigate();
  const [checkoutPrize, setCheckoutPrize] = useState<Prize | null>(null);

  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.prize.getWatchlist(),
    enabled: !!session,
  });

  const prizes: Prize[] = useMemo(() => {
    return (items ?? []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description ?? undefined,
      imageUrl: item.imageUrl ?? undefined,
      imageUrls: item.imageUrls,
      coverImageIndex: 0,
      category: item.category,
      grade: item.grade ?? null,
      amount: item.amount,
      stock: item.stock,
      purchaseOption: item.purchaseOption,
      brand: item.brand,
      createdBy: item.createdBy,
      createdByUsername: item.createdByUsername,
      createdByShopName: item.createdByShopName,
      sellerDisplayName: item.createdByShopName ?? item.createdByUsername ?? null,
      isProOnly: item.isProOnly ?? false,
      proEarlyAccessUntil: item.proEarlyAccessUntil ?? null,
      viewCount: item.viewCount ?? 0,
      watcherCount: item.watcherCount ?? 0,
      // Items returned by /prizes/watchlist are by definition watched.
      isWatching: item.isWatching ?? true,
    }));
  }, [items]);

  if (!isSessionLoading && !session) {
    return (
      <MainLayout showFooter>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Heart className="h-10 w-10 text-rose-500" />
          <h2 className="text-2xl font-bold">Sign in to view your watchlist</h2>
          <p className="text-muted-foreground max-w-md">
            Save items you love and we&apos;ll let you know when the price drops or
            they sell out.
          </p>
          <Button onClick={() => navigate('/login')}>Sign in</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              My Watchlist
            </h2>
            {!isLoading && prizes.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {prizes.length} {prizes.length === 1 ? 'item' : 'items'} saved
              </span>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-3">We couldn&apos;t load your watchlist.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && prizes.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <Heart className="h-10 w-10 text-rose-500" />
            <h3 className="text-lg font-semibold">No saved items yet</h3>
            <p className="text-muted-foreground max-w-md">
              Tap the heart on any item to add it here. We&apos;ll notify you about price changes
              and when items sell out.
            </p>
            <Button onClick={() => navigate('/shop')}>Browse the shop</Button>
          </div>
        )}

        {!isLoading && !isError && prizes.length > 0 && (
          <PrizesByCategory
            prizes={prizes}
            onPrizeClick={prize => setCheckoutPrize(prize)}
            showFilters={false}
            showCategoryHeaders={false}
          />
        )}

        {checkoutPrize && (
          <PrizeCheckoutModal
            isOpen={!!checkoutPrize}
            onClose={() => setCheckoutPrize(null)}
            prizeId={checkoutPrize.id}
            prizeName={checkoutPrize.name}
            prizeAmount={checkoutPrize.amount ?? 0}
            userCadeCoins={session?.cadeCoins ?? 0}
            // CadeCoin payments are only valid for admin-owned (CardCade) items.
            // Seller-owned items always have a creator id, so card-only.
            allowCadeCoins={!checkoutPrize.createdBy}
            isShopItem
          />
        )}
      </div>
    </MainLayout>
  );
}
