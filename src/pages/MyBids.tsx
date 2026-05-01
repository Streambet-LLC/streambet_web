import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel } from 'lucide-react';

import api from '@/integrations/api/client';
import { MainLayout } from '@/components/layout';
import { useAuthContext } from '@/contexts/AuthContext';
import { PrizesByCategory, type Prize } from '@/components/prizes/PrizesByCategory';
import { Button } from '@/components/ui/button';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';

/**
 * Authenticated user's auction bid history grouped by item, with the
 * most-recently-bid item first. Mirrors the Watchlist page so cards
 * (with auction state, "Raise your max", etc.) render identically to
 * the rest of the shop.
 */
export default function MyBids() {
  const { session, isLoading: isSessionLoading } = useAuthContext();
  const navigate = useNavigate();
  const [checkoutPrize, setCheckoutPrize] = useState<Prize | null>(null);

  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['my-bids'],
    queryFn: () => api.prize.getMyBids(),
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
      sellerDisplayName:
        item.createdByShopName ?? item.createdByUsername ?? null,
      isProOnly: item.isProOnly ?? false,
      proEarlyAccessUntil: item.proEarlyAccessUntil ?? null,
      viewCount: item.viewCount ?? 0,
      watcherCount: item.watcherCount ?? 0,
      isWatching: item.isWatching ?? false,
      saleType: item.saleType,
      auction: item.auction ?? null,
    }));
  }, [items]);

  if (!isSessionLoading && !session) {
    return (
      <MainLayout showFooter>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Gavel className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold">Sign in to view your bids</h2>
          <p className="text-muted-foreground max-w-md">
            Track every auction you&apos;ve bid on, see who&apos;s leading,
            and raise your max without losing your place.
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
              <Gavel className="h-5 w-5 text-primary" />
              My Bids
            </h2>
            {!isLoading && prizes.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {prizes.length} {prizes.length === 1 ? 'auction' : 'auctions'}
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
            <p className="text-muted-foreground mb-3">We couldn&apos;t load your bids.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && prizes.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <Gavel className="h-10 w-10 text-primary" />
            <h3 className="text-lg font-semibold">No bids yet</h3>
            <p className="text-muted-foreground max-w-md">
              When you place a bid on an auction it will show up here so you can keep tabs on it and
              raise your max if needed.
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
            allowCadeCoins={!checkoutPrize.createdBy}
            isShopItem
            sellerCryptoEnabled={checkoutPrize.sellerCryptoEnabled ?? false}
          />
        )}
      </div>
    </MainLayout>
  );
}
