import { MainLayout } from "@/components/layout";
import { usePrizeTiers } from '@/hooks/usePrizeConfig';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
import { PrizeBrand } from '@/types/prize';
import PrizeCard from '@/components/prizes/PrizeCard';
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
  const { data: tiers, isLoading } = usePrizeTiers();
  const { session } = useAuthContext();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedPrizeForCheckout, setSelectedPrizeForCheckout] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);
  const [selectedPrizeForOffer, setSelectedPrizeForOffer] = useState<PrizeDisplay | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(24);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');

  // Get brand filter from URL params (supports comma-separated values)
  const brandFilterParam = searchParams.get('brand');
  const selectedBrands = brandFilterParam ? brandFilterParam.split(',') : [];

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

  // Get all prizes with stock and filter for redemptions page
  const allPrizes: PrizeDisplay[] = useMemo(() => {
    return (tiers || [])
      .filter(prize => prize.stock > 0 && prize.showOnShop !== false)
      .map(prize => ({
        id: prize.id,
        name: prize.name,
        description: prize.description || undefined,
        imageUrl: prize.imageUrl || undefined,
        category: mapCategory(prize),
        amount: typeof prize.amount === 'number' && !isNaN(prize.amount) ? prize.amount : 0,
        stock: prize.stock,
        purchaseOption: prize.purchaseOption,
        brand: prize.brand,
        displayOrder: prize.displayOrder ?? 0,
      }))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [tiers]);

  // Featured prizes (top 8 by display order)
  const featuredPrizes = useMemo(() => {
    return [...allPrizes]
      .slice(0, 8);
  }, [allPrizes]);

  // Filter by brand and price
  const filteredPrizes = useMemo(() => {
    let filtered = selectedBrands.length > 0
      ? allPrizes.filter(prize => prize.brand && selectedBrands.includes(prize.brand))
      : allPrizes;

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

    return filtered;
  }, [allPrizes, selectedBrands, minPrice, maxPrice]);

  // Display only first N items (client-side pagination)
  const displayedPrizes = filteredPrizes.slice(0, displayCount);
  const hasMore = displayCount < filteredPrizes.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 24);
  };

  const handleOfferClick = (prize: PrizeDisplay) => {
    setSelectedPrizeForOffer(prize);
    setIsOfferModalOpen(true);
  };

  return (
    <MainLayout>
      <div className="w-full flex flex-col gap-6">
        {/* Hero Section */}
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
            {/* <p className="text-[#FFFFFFBF]">
              Redeem items with CadeCoins or USD, or a combination of both!
            </p> */}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Featured Items Carousel */}
            {featuredPrizes.length > 0 && (
              <>
                <h2 className="text-2xl font-bold px-2">Featured Items:</h2>
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
                          <PrizeCard
                            prize={prize}
                            onClick={prize =>
                              setSelectedPrizeForCheckout({
                                id: prize.id,
                                name: prize.name,
                                amount: prize.amount ?? 0,
                              })
                            }
                            onOfferClick={handleOfferClick}
                            isFeatured
                          />
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

            {/* All Items Section */}
            <h2 className="text-2xl font-bold mb-4 px-2">All Items:</h2>
            
            {/* Brand Filter Tabs */}
            <div className="flex flex-col gap-4">
              <div
                className={`flex gap-2 pb-2 scrollbar-hide ${isMobile ? 'w-full flex-wrap' : 'justify-center overflow-x-auto'}`}
                role="tablist"
                aria-label="Prize brands"
              >
                <Button
                  variant="outline"
                  role="tab"
                  aria-selected={selectedBrands.length === 0}
                  className={`${
                    selectedBrands.length === 0
                      ? `bg-primary text-black ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`
                      : `border-primary shadow-[0_0_8px_rgba(189,255,0,0.5)] ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`
                  }`}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('brand');
                    setSearchParams(newParams);
                  }}
                >
                  All Brands
                </Button>
                {(['pokemon', 'one_piece', 'sports', 'other'] as PrizeBrand[]).map(brand => (
                  <Button
                    key={brand}
                    variant="outline"
                    role="tab"
                    aria-selected={selectedBrands.includes(brand)}
                    className={`${
                      selectedBrands.includes(brand)
                        ? `bg-primary text-black ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`
                        : `border-primary shadow-[0_0_8px_rgba(189,255,0,0.5)] ${isMobile ? 'flex-1 px-3 py-2 text-xs' : ''}`
                    }`}
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set('brand', brand);
                      setSearchParams(newParams);
                    }}
                  >
                    {getBrandLabel(brand)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Filter Toggle & Section */}
            <div className="px-2">
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
                  </>
                )}
              </Button>

              {showPriceFilter && (
                <div className="bg-secondary/50 p-4 rounded-lg space-y-4 mt-4">
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
            </div>

            {/* Items Grid */}
            <div className="flex flex-col gap-4" role="tabpanel">
              {filteredPrizes.length === 0 ? (
                <div className="mx-auto text-weak py-12">
                  {selectedBrands.length > 0 ? 'No items found for selected brands.' : 'No items available.'}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayedPrizes.map(prize => (
                      <PrizeCard
                        key={prize.id}
                        prize={prize}
                        onClick={prize =>
                          setSelectedPrizeForCheckout({
                            id: prize.id,
                            name: prize.name,
                            amount: prize.amount ?? 0,
                          })
                        }
                        onOfferClick={handleOfferClick}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <Button
                      disabled={isLoading}
                      variant="outline"
                      className="mx-auto border-primary"
                      onClick={handleLoadMore}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" />
                          Loading
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
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
