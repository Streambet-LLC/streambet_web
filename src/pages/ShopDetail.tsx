import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { usePrizeTiers } from '@/hooks/usePrizeConfig';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  PrizesByCategory,
  Prize as PrizeDisplay,
} from '@/components/prizes/PrizesByCategory';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { getImageLink } from '@/utils/helper';

// Map usernames to shop names
const SHOP_NAMES: Record<string, string> = {
  nvantzos: "Nick's Niceties",
};

export default function ShopDetail() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const { data: tiers, isLoading: isLoadingPrizes } = usePrizeTiers();
  const { session } = useAuthContext();
  const [selectedPrizeForCheckout, setSelectedPrizeForCheckout] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);

  // Get brand filter from URL params (supports comma-separated values)
  const brandFilterParam = searchParams.get('brand');
  const selectedBrands = brandFilterParam ? brandFilterParam.split(',') : [];

  // Fetch shop owner's profile
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: async () => {
      if (!username) return null;
      const response = await api.user.getUserProfile(username);
      return response;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });

  const userCadeCoins = session?.walletBalanceCadeCoin || 0;
  const shopName = username ? SHOP_NAMES[username] || username : 'Shop';

  // Filter to only show slabs with stock
  const filtered = (tiers || [])
    .filter(prize => prize.category === 'slab' && prize.stock > 0 && prize.showOnNicksNiceties !== false)
    .map(prize => ({
      id: prize.id,
      name: prize.name,
      description: prize.description || undefined,
      imageUrl: prize.imageUrl || undefined,
      category: 'slab' as const,
      amount: typeof prize.amount === 'number' && !isNaN(prize.amount) ? prize.amount : 0,
      stock: prize.stock,
      purchaseOption: prize.purchaseOption,
      brand: prize.brand,
      displayOrder: prize.displayOrderNicksNiceties ?? 999,
    }));

  // Check if purchase option sorting is enabled
  const usePurchaseSort = tiers?.[0]?.sortByPurchaseOptionNicksNiceties ?? false;

  // Sort prizes
  let slabPrizes: PrizeDisplay[];
  if (usePurchaseSort) {
    // Sort by purchaseOption first, then displayOrder
    slabPrizes = filtered.sort((a, b) => {
      const purchaseOrder = { both: 0, buy_only: 1, offers_only: 2 };
      const aPurchase = purchaseOrder[a.purchaseOption] ?? 3;
      const bPurchase = purchaseOrder[b.purchaseOption] ?? 3;
      if (aPurchase !== bPurchase) return aPurchase - bPurchase;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  } else {
    // Sort by displayOrder only
    slabPrizes = filtered.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  }

  // Apply brand filter if any brands are selected
  if (selectedBrands.length > 0) {
    slabPrizes = slabPrizes.filter(prize => 
      prize.brand && selectedBrands.includes(prize.brand)
    );
  }

  const isLoading = isLoadingPrizes || isLoadingProfile;

  return (
    <MainLayout>
      {/* Shop Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          {/* Shop Owner Avatar */}
          <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary">
            {userProfile?.data?.profileImageUrl ? (
              <img
                src={getImageLink(userProfile.data.profileImageUrl)}
                alt={shopName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {shopName[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Shop Info */}
          <div>
            <h1 className="text-3xl font-bold">{shopName}</h1>
            <p className="text-muted-foreground">@{username}</p>
          </div>
        </div>
      </div>

      {/* Shop Items */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <PrizesByCategory
          prizes={slabPrizes}
          onPrizeClick={prize =>
            setSelectedPrizeForCheckout({
              id: prize.id,
              name: prize.name,
              amount: prize.amount ?? 0,
            })
          }
          showFilters={true}
          showCategoryHeaders={false}
          showBrandFilter={false}
        />
      )}

      {/* Checkout Modal */}
      {selectedPrizeForCheckout && (
        <PrizeCheckoutModal
          isOpen={!!selectedPrizeForCheckout}
          onClose={() => setSelectedPrizeForCheckout(null)}
          prizeId={selectedPrizeForCheckout.id}
          prizeName={selectedPrizeForCheckout.name}
          prizeAmount={selectedPrizeForCheckout.amount}
          userCadeCoins={userCadeCoins}
        />
      )}
    </MainLayout>
  );
}
