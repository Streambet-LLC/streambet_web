import { MainLayout } from "@/components/layout";
import { useShopItems } from '@/hooks/usePrizeConfig';
import { Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { prizeAPI } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';
import { PrizeCategoryType, Prize as PrizeDisplay } from '@/components/prizes/PrizesByCategory';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';
import { MakeOfferModal } from '@/components/prizes/MakeOfferModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/SearchInput';
import { PrizeBrand } from '@/types/prize';
import PrizeCard from '@/components/prizes/PrizeCard';
import AuctionCard from '@/components/prizes/AuctionCard';
import { resolvePrizeImages } from '@/components/prizes/prizeImageUtils';
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, useReducedMotion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';

// Helper function to get brand label
const getBrandLabel = (brand: PrizeBrand): string => {
  const labels: Record<PrizeBrand, string> = {
    pokemon: 'Pokémon',
    one_piece: 'One Piece',
    sports: 'Sports',
    other: 'Other',
  };
  return labels[brand];
};

export default function Prizes() {
  const { session } = useAuthContext();
  const { data: tiers, isLoading } = useShopItems();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPrizeForCheckout, setSelectedPrizeForCheckout] = useState<{
    id: string;
    name: string;
    amount: number;
    createdBy: string | null;
  } | null>(null);
  const [selectedPrizeForOffer, setSelectedPrizeForOffer] = useState<PrizeDisplay | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [displayCounts, setDisplayCounts] = useState<Record<string, number>>({
    slab: 24,
    sealed: 24,
    raw: 24,
    other: 24,
  });
  const [showPriceFilter, setShowPriceFilter] = useState(!isMobile);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Get brand filter from URL params (supports comma-separated values)
  const brandFilterParam = searchParams.get('brand');
  const selectedBrands = brandFilterParam ? brandFilterParam.split(',') : [];

  // Get category filter from URL params (supports comma-separated values)
  const categoryFilterParam = searchParams.get('category');
  const selectedCategories = categoryFilterParam ? categoryFilterParam.split(',') : [];

  // Get grade filter from URL params (supports comma-separated values)
  const gradeFilterParam = searchParams.get('grade');
  const selectedGrades = gradeFilterParam ? gradeFilterParam.split(',') : [];

  const userCadeCoins = session?.walletBalanceCadeCoin || 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const orderId = params.get('orderId');
    const acceptCounter = params.get('acceptCounter');

    if (acceptCounter) {
      if (!session) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to accept this counter offer.',
          variant: 'destructive',
        });
        params.delete('acceptCounter');
        const next = new URL(window.location.href);
        next.search = params.toString();
        window.history.replaceState({}, '', next.pathname + (next.search ? `?${next.search}` : ''));
        return;
      }

      prizeAPI
        .acceptCounterOffer(acceptCounter)
        .then((response: any) => {
          if (response.stripeSessionUrl) {
            window.location.href = response.stripeSessionUrl;
          } else {
            toast({
              title: 'Error',
              description: 'Failed to create checkout session.',
              variant: 'destructive',
            });
          }
        })
        .catch(() => {
          toast({
            title: 'Error',
            description: 'Failed to accept counter offer. Please try again.',
            variant: 'destructive',
          });
        });
      return;
    }

    if (!status) {
      return;
    }

    if (status === 'success' && orderId) {
      prizeAPI
        .confirmPrizeOrder(orderId)
        .then(() => {
          toast({
            title: 'Payment successful',
            description: 'Your prize order is confirmed and will be processed for shipping.',
          });
        })
        .catch(() => {
          toast({
            title: 'Payment processing',
            description: 'We are confirming your payment. Please check back shortly.',
          });
        });
    } else if (status === 'cancel') {
      toast({
        title: 'Payment canceled',
        description: 'Your payment was canceled. No charges were made.',
        variant: 'destructive',
      });
    }

    params.delete('status');
    params.delete('orderId');
    const next = new URL(window.location.href);
    next.search = params.toString();
    window.history.replaceState({}, '', next.pathname + (next.search ? `?${next.search}` : ''));
  }, [session]);

  const mapCategory = (prize: any): PrizeCategoryType => {
    if (prize.category) return prize.category;
    return 'slab';
  };

  // Get all shop items with stock from all sellers
  const allPrizes: PrizeDisplay[] = useMemo(() => {
    const filtered = (tiers || [])
      // Shop list is controlled by showOnShop only.
      // We intentionally do not use showOnRedemptions so redeem-only items
      // no longer leak into the shop page.
      .filter(prize => prize.stock > 0 && prize.showOnShop !== false)
      .map(prize => {
        const { imageUrls, coverImageIndex, coverImageUrl } = resolvePrizeImages(prize);

        return {
          id: prize.id,
          name: prize.name,
          description: prize.description || undefined,
          imageUrl: coverImageUrl,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          coverImageIndex,
          category: mapCategory(prize),
          grade: (prize as any).grade || null,
          amount: typeof prize.amount === 'number' && !isNaN(prize.amount) ? prize.amount : 0,
          stock: prize.stock,
          purchaseOption: prize.purchaseOption,
          brand: prize.brand,
          displayOrder: prize.displayOrderShop ?? 999,
          featuredDisplayOrder: prize.featuredDisplayOrder ?? null,
          createdBy: prize.createdBy || 'cardcade',
          createdByUsername: prize.createdByUsername || 'cardcade',
          sellerDisplayName: prize.createdByShopName || prize.createdByUsername || 'CardCade Shop',
          isProOnly: prize.isProOnly ?? false,
          proEarlyAccessUntil: prize.proEarlyAccessUntil ?? null,
          viewCount: prize.viewCount ?? 0,
          watcherCount: prize.watcherCount ?? 0,
          isWatching: prize.isWatching ?? false,
          saleType: prize.saleType,
          auction: prize.auction ?? null,
        };
      });

    // Check if purchase option sorting is enabled (use first prize's setting)
    const usePurchaseSort = tiers?.[0]?.sortByPurchaseOptionShop ?? false;

    if (usePurchaseSort) {
      // Sort by purchaseOption first, then displayOrder
      return filtered.sort((a, b) => {
        const purchaseOrder = { both: 0, buy_only: 1, offers_only: 2 };
        const aPurchase = purchaseOrder[a.purchaseOption] ?? 3;
        const bPurchase = purchaseOrder[b.purchaseOption] ?? 3;
        if (aPurchase !== bPurchase) return aPurchase - bPurchase;
        return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
      });
    } else {
      // Sort by displayOrder only
      return filtered.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
    }
  }, [tiers]);

  // Featured prizes: when any auctions are live we replace the curated
  // featured strip with those auctions (sorted by soonest endsAt).
  // Otherwise we fall back to the admin-curated featuredDisplayOrder list.
  const featuredPrizes = useMemo(() => {
    const isLiveAuction = (prize: PrizeDisplay) =>
      prize.saleType === 'auction' &&
      !!prize.auction &&
      (prize.auction.status === 'active' || prize.auction.status === 'scheduled');

    const liveAuctions = allPrizes.filter(isLiveAuction).sort((a, b) => {
      if (!a.auction || !b.auction) return 0;
      return new Date(a.auction.endsAt).getTime() - new Date(b.auction.endsAt).getTime();
    });

    if (liveAuctions.length > 0) {
      return liveAuctions;
    }

    return allPrizes
      .filter(
        prize => prize.featuredDisplayOrder !== null && prize.featuredDisplayOrder !== undefined
      )
      .sort((a, b) => {
        const orderA = a.featuredDisplayOrder ?? 0;
        const orderB = b.featuredDisplayOrder ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });
  }, [allPrizes]);

  // Filter by brand, category, and price
  const filteredPrizes = useMemo(() => {
    let filtered =
      selectedBrands.length > 0
        ? allPrizes.filter(prize => prize.brand && selectedBrands.includes(prize.brand))
        : allPrizes;

    // Apply category filter if set
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(
        prize => prize.category && selectedCategories.includes(prize.category)
      );
    }

    // Apply grade filter if set
    if (selectedGrades.length > 0) {
      filtered = filtered.filter(prize => prize.grade && selectedGrades.includes(prize.grade));
    }

    // Apply price filter if set
    if (minPrice !== '' || maxPrice !== '') {
      filtered = filtered.filter(prize => {
        // Only show items with a buy price (not offers_only)
        if (prize.purchaseOption === 'offers_only' || !prize.amount) return false;

        // Convert CadeCoins to USD (50 coins = $1)
        const priceInUSD = prize.amount / 50;
        const min = minPrice === '' ? 0 : minPrice;
        const max = maxPrice === '' ? Infinity : maxPrice;

        return priceInUSD >= min && priceInUSD <= max;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prize => {
        const matchesName = prize.name?.toLowerCase().includes(query);
        const matchesDescription = prize.description?.toLowerCase().includes(query);
        const matchesSeller = prize.sellerDisplayName?.toLowerCase().includes(query);
        return matchesName || matchesDescription || matchesSeller;
      });
    }

    return filtered;
  }, [
    allPrizes,
    selectedBrands,
    selectedCategories,
    selectedGrades,
    minPrice,
    maxPrice,
    searchQuery,
  ]);

  // Group filtered prizes by category for per-section pagination
  const prizesByCategory = useMemo(() => {
    const grouped: Record<string, PrizeDisplay[]> = { slab: [], sealed: [], raw: [], other: [] };
    filteredPrizes.forEach(p => {
      const cat = p.category || 'slab';
      if (grouped[cat]) grouped[cat].push(p);
    });
    return grouped;
  }, [filteredPrizes]);

  const handleOfferClick = (prize: PrizeDisplay) => {
    setSelectedPrizeForOffer(prize);
    setIsOfferModalOpen(true);
  };

  return (
    <MainLayout>
      <div className="w-full flex flex-col gap-6">
        {/* Show Landing Hero for logged out users, simple header for logged in */}
        {!session ? (
          <LandingHero />
        ) : (
          <div className="max-w-3xl mx-auto text-center space-y-4 p-4">
            <h1 className="text-4xl md:text-5xl font-bold flex justify-center">
              <motion.div
                className="relative inline-block"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-electric-lime to-creator-green blur-lg opacity-30"
                  animate={shouldReduceMotion ? undefined : { scale: [1, 1.2, 1] }}
                  transition={shouldReduceMotion ? undefined : { duration: 3, repeat: Infinity }}
                />
                <img
                  src="/wordmark.svg"
                  alt="CardCade"
                  className="relative h-12 md:h-16 w-auto object-contain"
                />
              </motion.div>
            </h1>
            <div className="space-y-2">
              <p className="text-[#FFFFFFBF]">
                Your friendly neighborhood trading cards marketplace
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Scrolling Text Banner - Show only for logged out users */}
            {!session && (
              <div className="w-full overflow-hidden bg-gradient-to-r from-electric-lime via-creator-green to-electric-lime py-6 my-8 -mx-4">
                <motion.div
                  className="flex whitespace-nowrap"
                  animate={{
                    x: [0, -2000],
                  }}
                  transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <span
                    className="text-2xl md:text-4xl font-black text-black tracking-wider"
                    style={{ wordSpacing: '0.5em' }}
                  >
                    LOWER FEES • EASY-TO-USE • TOP SELLERS • LOWER FEES • EASY-TO-USE • TOP SELLERS
                    • LOWER FEES • EASY-TO-USE • TOP SELLERS • LOWER FEES • EASY-TO-USE • TOP
                    SELLERS • LOWER FEES • EASY-TO-USE • TOP SELLERS • LOWER FEES • EASY-TO-USE •
                    TOP SELLERS •
                  </span>
                </motion.div>
              </div>
            )}

            {/* Featured Items Carousel - Show for all users */}
            {featuredPrizes.length > 0 && (
              <>
                {session && <h2 className="text-2xl font-bold px-2">Featured Items:</h2>}
                <div className="p-6 -mx-4">
                  <Carousel
                    className="flex-1 w-full"
                    opts={{
                      align: 'start',
                      loop: true,
                      slidesToScroll: 1,
                      containScroll: 'trimSnaps',
                    }}
                  >
                    <CarouselContent className="flex-1">
                      {featuredPrizes.map(prize => (
                        <CarouselItem
                          key={prize.id}
                          className="basis-full md:basis-1/2 lg:basis-1/4 pl-4"
                        >
                          {prize.saleType === 'auction' && prize.auction ? (
                            <AuctionCard
                              prize={prize as PrizeDisplay & { auction: NonNullable<PrizeDisplay['auction']> }}
                              isFeatured
                            />
                          ) : (
                            <PrizeCard
                              prize={prize}
                              onClick={prize =>
                                setSelectedPrizeForCheckout({
                                  id: prize.id,
                                  name: prize.name,
                                  amount: prize.amount ?? 0,
                                  createdBy: prize.createdBy ?? null,
                                })
                              }
                              onOfferClick={handleOfferClick}
                              isFeatured
                              hideButtons={!session}
                            />
                          )}
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <div className="flex items-center justify-between pt-4">
                      <CarouselPrevious
                        className="relative top-0 left-0 translate-y-[unset] translate-x-[unset] border-primary"
                        size="lg"
                      />
                      <CarouselDots className="relative" />
                      <CarouselNext
                        className="relative top-0 left-0 translate-y-[unset] translate-x-[unset] border-primary"
                        size="lg"
                      />
                    </div>
                  </Carousel>
                </div>
              </>
            )}

            {/* Show landing features for logged out users */}
            {!session && <LandingFeatures />}

            {/* All Items Section - Only for logged in users */}
            {session && (
              <>
                <h2 className="text-2xl font-bold mb-4 px-2">All Items:</h2>

                {/* Filters Toggle & Section */}
                <div className="px-2 space-y-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPriceFilter(!showPriceFilter)}
                    className="flex items-center gap-2 border-primary"
                  >
                    {showPriceFilter ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide Filters
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show Filters
                        {(selectedBrands.length > 0 ||
                          selectedCategories.length > 0 ||
                          selectedGrades.length > 0 ||
                          minPrice !== '' ||
                          maxPrice !== '') && (
                          <span className="ml-1 bg-primary text-black text-xs rounded-full px-1.5 py-0.5 font-bold">
                            {selectedBrands.length +
                              selectedCategories.length +
                              selectedGrades.length +
                              (minPrice !== '' || maxPrice !== '' ? 1 : 0)}
                          </span>
                        )}
                      </>
                    )}
                  </Button>

                  {showPriceFilter && (
                    <div className="bg-secondary/50 p-4 rounded-lg space-y-4 mt-4">
                      {/* Brand Filter */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Card Type:</h3>
                        <div
                          className={`flex gap-2 scrollbar-hide ${isMobile ? 'w-full flex-wrap' : 'flex-wrap'}`}
                          role="tablist"
                          aria-label="Prize brands"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            role="tab"
                            aria-selected={selectedBrands.length === 0}
                            className={`${
                              selectedBrands.length === 0
                                ? 'bg-primary text-black'
                                : 'border-primary shadow-[0_0_8px_rgba(189,255,0,0.5)]'
                            } ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`}
                            onClick={() => {
                              const newParams = new URLSearchParams(searchParams);
                              newParams.delete('brand');
                              setSearchParams(newParams);
                            }}
                          >
                            All
                          </Button>
                          {(['pokemon', 'one_piece', 'sports', 'other'] as PrizeBrand[]).map(
                            brand => (
                              <Button
                                key={brand}
                                variant="outline"
                                size="sm"
                                role="tab"
                                aria-selected={selectedBrands.includes(brand)}
                                className={`${
                                  selectedBrands.includes(brand)
                                    ? 'bg-primary text-black'
                                    : 'border-primary shadow-[0_0_8px_rgba(189,255,0,0.5)]'
                                } ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`}
                                onClick={() => {
                                  const newParams = new URLSearchParams(searchParams);
                                  const brandIndex = selectedBrands.indexOf(brand);
                                  let updatedBrands: string[];

                                  if (brandIndex > -1) {
                                    updatedBrands = selectedBrands.filter(b => b !== brand);
                                  } else {
                                    updatedBrands = [...selectedBrands, brand];
                                  }

                                  if (updatedBrands.length > 0) {
                                    newParams.set('brand', updatedBrands.join(','));
                                  } else {
                                    newParams.delete('brand');
                                  }
                                  setSearchParams(newParams);
                                }}
                              >
                                {getBrandLabel(brand)}
                              </Button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Product Type:</h3>
                        <div
                          className={`flex gap-2 scrollbar-hide ${isMobile ? 'w-full flex-wrap' : 'flex-wrap'}`}
                          role="tablist"
                          aria-label="Item conditions"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            role="tab"
                            aria-selected={selectedCategories.length === 0}
                            className={`${
                              selectedCategories.length === 0
                                ? 'bg-primary text-black'
                                : 'border-primary shadow-[0_0_8px_rgba(189,255,0,0.5)]'
                            } ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`}
                            onClick={() => {
                              const newParams = new URLSearchParams(searchParams);
                              newParams.delete('category');
                              setSearchParams(newParams);
                            }}
                          >
                            All
                          </Button>
                          {(
                            [
                              ['raw', 'Raw'],
                              ['slab', 'Slabs'],
                              ['sealed', 'Sealed'],
                              ['other', 'Other'],
                            ] as const
                          ).map(([cat, label]) => (
                            <Button
                              key={cat}
                              variant="outline"
                              size="sm"
                              role="tab"
                              aria-selected={selectedCategories.includes(cat)}
                              className={`${
                                selectedCategories.includes(cat)
                                  ? 'bg-primary text-black'
                                  : 'border-primary shadow-[0_0_8px_rgba(189,255,0,0.5)]'
                              } ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`}
                              onClick={() => {
                                const newParams = new URLSearchParams(searchParams);
                                const catIndex = selectedCategories.indexOf(cat);
                                let updatedCats: string[];

                                if (catIndex > -1) {
                                  updatedCats = selectedCategories.filter(c => c !== cat);
                                } else {
                                  updatedCats = [...selectedCategories, cat];
                                }

                                if (updatedCats.length > 0) {
                                  newParams.set('category', updatedCats.join(','));
                                } else {
                                  newParams.delete('category');
                                }
                                setSearchParams(newParams);
                              }}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Grade Filter - Show only when raw or slab is selected */}
                      {selectedCategories.length > 0 &&
                        (selectedCategories.includes('raw') ||
                          selectedCategories.includes('slab')) && (
                          <div>
                            <h3 className="text-sm font-semibold mb-3">
                              {selectedCategories.includes('slab') ? 'Grade:' : 'Condition:'}
                            </h3>
                            <div
                              className={`flex gap-2 scrollbar-hide ${isMobile ? 'w-full flex-wrap' : 'flex-wrap'}`}
                              role="tablist"
                              aria-label="Item grades"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                role="tab"
                                aria-selected={selectedGrades.length === 0}
                                className={`${
                                  selectedGrades.length === 0
                                    ? 'bg-primary text-black'
                                    : 'border-primary shadow-[0_0_8px_rgba(189,255,0,0.5)]'
                                } ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`}
                                onClick={() => {
                                  const newParams = new URLSearchParams(searchParams);
                                  newParams.delete('grade');
                                  setSearchParams(newParams);
                                }}
                              >
                                All
                              </Button>
                              {(selectedCategories.includes('slab')
                                ? ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1']
                                : ['NM', 'LP', 'MP', 'HP', 'DMG', 'MT', 'EX', 'VG', 'GD', 'PR']
                              ).map(grade => (
                                <Button
                                  key={grade}
                                  variant="outline"
                                  size="sm"
                                  role="tab"
                                  aria-selected={selectedGrades.includes(grade)}
                                  className={`${
                                    selectedGrades.includes(grade)
                                      ? 'bg-primary text-black'
                                      : 'border-primary shadow-[0_0_8px_rgba(189,255,0,0.5)]'
                                  } ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`}
                                  onClick={() => {
                                    const newParams = new URLSearchParams(searchParams);
                                    const idx = selectedGrades.indexOf(grade);
                                    let updated: string[];
                                    if (idx > -1) {
                                      updated = selectedGrades.filter(g => g !== grade);
                                    } else {
                                      updated = [...selectedGrades, grade];
                                    }
                                    if (updated.length > 0) {
                                      newParams.set('grade', updated.join(','));
                                    } else {
                                      newParams.delete('grade');
                                    }
                                    setSearchParams(newParams);
                                  }}
                                >
                                  {grade}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Price Filter */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Price (USD):</h3>
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
                            <p className="text-xs text-red-500 mt-2">
                              Max should be greater than min
                            </p>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Search Input */}
                  <SearchInput
                    id="prizes-search"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    width="md"
                  />
                </div>

                {/* Items Grid - Grouped by Category */}
                <div className="flex flex-col gap-4" role="tabpanel">
                  {filteredPrizes.length === 0 ? (
                    <div className="mx-auto text-weak py-12">
                      {selectedBrands.length > 0 || selectedCategories.length > 0
                        ? 'No items found for selected filters.'
                        : 'No items available.'}
                    </div>
                  ) : (
                    <>
                      {(['slab', 'sealed', 'raw', 'other'] as const).map(cat => {
                        const allCatPrizes = prizesByCategory[cat] || [];
                        if (allCatPrizes.length === 0) return null;
                        const catDisplayCount = displayCounts[cat] || 24;
                        const catPrizes = allCatPrizes.slice(0, catDisplayCount);
                        const catHasMore = catDisplayCount < allCatPrizes.length;
                        const catLabel =
                          cat === 'raw'
                            ? 'Raw'
                            : cat === 'slab'
                              ? 'Slabs'
                              : cat === 'sealed'
                                ? 'Sealed'
                                : 'Other';
                        return (
                          <div key={cat}>
                            <h3 className="text-4xl font-bold mb-8 py-6 flex items-center gap-2">
                              {catLabel}
                              <span className="text-base font-normal text-muted-foreground">
                                ({allCatPrizes.length})
                              </span>
                              {cat === 'raw' && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button type="button" className="inline-flex">
                                      <Info className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    side="bottom"
                                    align="start"
                                    className="max-w-xs text-sm"
                                  >
                                    Raw card conditions are labeled by the seller. Purchase at your
                                    own risk!
                                  </PopoverContent>
                                </Popover>
                              )}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {catPrizes.map(prize => (
                                <PrizeCard
                                  key={prize.id}
                                  prize={prize}
                                  onClick={prize => {
                                    const fullPrize = allPrizes.find(p => p.id === prize.id);
                                    setSelectedPrizeForCheckout({
                                      id: prize.id,
                                      name: prize.name,
                                      amount: prize.amount ?? 0,
                                      createdBy: (fullPrize as any)?.createdBy ?? null,
                                    });
                                  }}
                                  onOfferClick={handleOfferClick}
                                />
                              ))}
                            </div>
                            {catHasMore && (
                              <div className="flex justify-center mt-4">
                                <Button
                                  disabled={isLoading}
                                  variant="outline"
                                  className="border-primary"
                                  onClick={() =>
                                    setDisplayCounts(prev => ({
                                      ...prev,
                                      [cat]: (prev[cat] || 24) + 24,
                                    }))
                                  }
                                >
                                  Load More {catLabel}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Checkout Modal */}
      {selectedPrizeForCheckout && (
        <PrizeCheckoutModal
          isOpen={!!selectedPrizeForCheckout}
          onClose={() => setSelectedPrizeForCheckout(null)}
          prizeId={selectedPrizeForCheckout.id}
          prizeName={selectedPrizeForCheckout.name}
          prizeAmount={selectedPrizeForCheckout.amount}
          userCadeCoins={userCadeCoins}
          allowCadeCoins={!selectedPrizeForCheckout.createdBy}
          isShopItem={!!selectedPrizeForCheckout.createdBy}
        />
      )}

      {/* Make Offer Modal */}
      {selectedPrizeForOffer && (
        <MakeOfferModal
          isOpen={isOfferModalOpen}
          onClose={() => {
            setIsOfferModalOpen(false);
            setSelectedPrizeForOffer(null);
          }}
          prize={selectedPrizeForOffer}
        />
      )}
    </MainLayout>
  );
}
