import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Loader2, Mail, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { PrizesByCategory, Prize as PrizeDisplay } from '@/components/prizes/PrizesByCategory';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { getImageLink } from '@/utils/helper';
import { formatUrl } from '@/utils/format';
import { FaInstagram, FaTiktok, FaTwitter, FaYoutube } from 'react-icons/fa';
import { PublicUserProfile } from '@/types/profile';
import { Button } from '@/components/ui/button';

const shopSocialsMapping = {
  instagram: {
    icon: <FaInstagram className="w-4 h-4" />,
    label: 'Instagram',
  },
  twitter: {
    icon: <FaTwitter className="w-4 h-4" />,
    label: 'Twitter',
  },
  youtube: {
    icon: <FaYoutube className="w-4 h-4" />,
    label: 'Youtube',
  },
  tiktok: {
    icon: <FaTiktok className="w-4 h-4" />,
    label: 'TikTok',
  },
} as const;

export default function ShopDetail() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const [selectedPrizeForCheckout, setSelectedPrizeForCheckout] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get brand filter from URL params (supports comma-separated values)
  const brandFilterParam = searchParams.get('brand');
  const selectedBrands = brandFilterParam ? brandFilterParam.split(',') : [];

  // Fetch seller shop and seller-specific inventory
  const { data: shopData, isLoading: isLoadingShop } = useQuery({
    queryKey: ['seller-shop-items', username],
    queryFn: async () => {
      if (!username) return null;
      return await api.prize.getShopItemsByUsername(username);
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });

  const { data: profileData } = useQuery<PublicUserProfile | null>({
    queryKey: ['shop-profile', username],
    queryFn: async () => {
      if (!username) return null;
      const response = await api.user.getUserProfile(username);
      return (response?.data ?? response ?? null) as PublicUserProfile | null;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });

  const userCadeCoins = session?.walletBalanceCadeCoin || 0;
  const shopName = shopData?.shop?.displayName || username || 'Shop';

  // Build guaranteed shop display name with fallbacks
  const sellerDisplayName = shopData?.shop?.displayName || username || 'Shop';

  const isOwnShop =
    !!username &&
    !!(session?.username || session?.user?.username) &&
    (session?.username || session?.user?.username)?.toLowerCase() === username.toLowerCase();
  const shopSocials =
    shopData?.shop?.socials ??
    profileData?.socials ??
    (isOwnShop ? (session?.socials ?? null) : null);

  // Filter to only show slabs with stock
  let slabPrizes: PrizeDisplay[] = (shopData?.items || [])
    .filter(prize => prize.category === 'slab' && prize.stock > 0 && prize.showOnShop !== false)
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
      displayOrder: prize.displayOrderShop ?? 999,
      createdBy: prize.createdBy ?? null,
      // Don't show shop link in shop detail - user is already in the shop
    }));

  // Check if purchase option sorting is enabled
  const usePurchaseSort = shopData?.items?.[0]?.sortByPurchaseOptionShop ?? false;

  // Sort prizes
  if (usePurchaseSort) {
    // Sort by purchaseOption first, then displayOrder
    slabPrizes = slabPrizes.sort((a, b) => {
      const purchaseOrder = { both: 0, buy_only: 1, offers_only: 2 };
      const aPurchase = purchaseOrder[a.purchaseOption] ?? 3;
      const bPurchase = purchaseOrder[b.purchaseOption] ?? 3;
      if (aPurchase !== bPurchase) return aPurchase - bPurchase;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  } else {
    // Sort by displayOrder only
    slabPrizes = slabPrizes.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  }

  // Apply brand filter if any brands are selected
  if (selectedBrands.length > 0) {
    slabPrizes = slabPrizes.filter(prize => prize.brand && selectedBrands.includes(prize.brand));
  }

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    slabPrizes = slabPrizes.filter(prize => {
      const matchesName = prize.name?.toLowerCase().includes(query);
      const matchesDescription = prize.description?.toLowerCase().includes(query);
      const matchesBrand = prize.brand?.toLowerCase().includes(query);
      
      return matchesName || matchesDescription || matchesBrand;
    });
  }

  const isLoading = isLoadingShop;

  return (
    <MainLayout>
      {/* Shop Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            {/* Shop Owner Avatar */}
            <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary">
              {shopData?.shop?.profileImageUrl ? (
                <img
                  src={getImageLink(shopData.shop.profileImageUrl)}
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

            {/* Shop Name and Username */}
            <div>
              <h1 className="text-3xl font-bold">{shopName}</h1>
              <p className="text-muted-foreground">@{username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Message Seller Button - Only show when logged in and not own shop */}
            {session && !isOwnShop && shopData?.shop?.id && (
              <Button
                onClick={() => navigate(`/inbox?seller=${shopData.shop.id}&sellerName=${encodeURIComponent(shopData.shop.displayName || username || '')}`)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 whitespace-nowrap md:px-4"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden md:inline">Message</span>
              </Button>
            )}

            {/* Manage Shop Button - Only show for shop owner */}
            {isOwnShop && (
              <Button
                onClick={() => navigate('/seller/shop/manage')}
                variant="default"
                size="sm"
                className="flex items-center gap-2 whitespace-nowrap md:px-4"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Manage Shop</span>
              </Button>
            )}
          </div>
        </div>

        {/* Social Links, Trading Experience, Location - Below the name section */}
        <div>
          {/* Social Links - Show Instagram, Twitter, YouTube, TikTok if they have values */}
          <div className="flex flex-wrap gap-2">
            {(['instagram', 'twitter', 'youtube', 'tiktok'] as const).map(social => {
              const mapped = shopSocialsMapping[social];
              const socialValue = shopSocials?.[social];
              const hasLink = !!socialValue && String(socialValue).trim().length > 0;
              const socialUrl = hasLink ? String(socialValue) : undefined;

              // Only render if they have a link
              if (!hasLink) return null;

              return (
                <div key={social} className="relative group">
                  <a
                    href={formatUrl(socialUrl!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-foreground transition-colors"
                    title={mapped.label}
                  >
                    {mapped.icon}
                    <span className="text-sm font-medium">{mapped.label}</span>
                  </a>
                </div>
              );
            })}
          </div>

          {/* Trading Experience and Location */}
          <div className="mt-4 space-y-4">
            {/* Trading Experience */}
            {shopData?.shop?.sellerTradingExperience && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cards Experience</p>
                <p className="text-sm mt-1">{shopData.shop.sellerTradingExperience}</p>
              </div>
            )}

            {/* Location */}
            {shopData?.shop?.country && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-sm mt-1">{shopData.shop.country}</p>
              </div>
            )}
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
          searchNode={
            <SearchInput
              id="shop-detail-search"
              placeholder="Search items..."
              value={searchQuery}
              onChange={setSearchQuery}
              width="lg"
            />
          }
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
          allowCadeCoins={false}
          isShopItem={true}
        />
      )}
    </MainLayout>
  );
}
