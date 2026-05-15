import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { getThumbnailUrl } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  DollarSign,
  Expand,
  X,
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader2,
  Pencil,
  Eye,
  Heart,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Prize } from './PrizesByCategory';
import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import FeaturedBetCard from '../FeaturedBetCard';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddToCart } from '@/hooks/useCart';
import { useCountdown } from '@/hooks/use-countdown';
import { useViewTracker } from '@/hooks/useViewTracker';
import WatchButton from './WatchButton';
import ShareItemButton from './ShareItemButton';
import MessageSellerButton from './MessageSellerButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { prizeAPI } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';

interface PrizeCardProps {
  prize: Prize;
  onClick: (prize: Prize) => void;
  onOfferClick?: (prize: Prize) => void;
  isFeatured?: boolean;
  /** 'shop' = stag-style portrait card (default); 'redemption' = prod-style landscape card */
  variant?: 'shop' | 'redemption';
  hideButtons?: boolean;
}

const SWIPE_THRESHOLD_PX = 40;
const SWIPE_SUPPRESS_CLICK_MS = 350;

const normalizePrizeImageUrls = (prize: Prize): string[] => {
  const uniqueUrls: string[] = [];
  const imageUrls = prize.imageUrls || [];

  imageUrls.forEach(imageUrl => {
    const trimmedUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    if (!trimmedUrl) {
      return;
    }

    const normalizedUrl = getThumbnailUrl(trimmedUrl);
    if (!uniqueUrls.includes(normalizedUrl)) {
      uniqueUrls.push(normalizedUrl);
    }
  });

  if (!uniqueUrls.length && prize.imageUrl) {
    uniqueUrls.push(getThumbnailUrl(prize.imageUrl));
  }

  return uniqueUrls;
};

const getSafeImageIndex = (index: number, imageCount: number): number => {
  if (imageCount <= 0) {
    return 0;
  }

  if (!Number.isInteger(index)) {
    return 0;
  }

  if (index < 0) {
    return 0;
  }

  if (index >= imageCount) {
    return imageCount - 1;
  }

  return index;
};

const resolveEbayFullResolutionImageUrl = (imageUrl: string): string => {
  try {
    const parsed = new URL(imageUrl);
    const isEbayImageHost = parsed.hostname.toLowerCase().includes('ebayimg.com');
    if (!isEbayImageHost) {
      return imageUrl;
    }

    const resizedPath = parsed.pathname.replace(
      /\/s-l\d+(\.[a-z0-9]+)?$/i,
      (_match, extension = '') => `/s-l1600${extension}`,
    );

    if (resizedPath === parsed.pathname) {
      return imageUrl;
    }

    parsed.pathname = resizedPath;
    return parsed.toString();
  } catch {
    return imageUrl;
  }
};

export default function PrizeCard({
  prize,
  onClick,
  onOfferClick,
  isFeatured = false,
  variant = 'shop',
  hideButtons = false,
}: PrizeCardProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [soldListingPreview, setSoldListingPreview] = useState<{
    activeUrl: string;
    thumbnailUrl: string;
    fullResolutionUrl: string;
    soldTitle: string;
  } | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [reportingListingId, setReportingListingId] = useState<string | null>(null);
  const [syncingMarketData, setSyncingMarketData] = useState(false);
  const queryClient = useQueryClient();
  const inlineTouchStartXRef = useRef<number | null>(null);
  const modalTouchStartXRef = useRef<number | null>(null);
  const suppressNextInlineOpenRef = useRef(false);

  const galleryImageUrls = useMemo(() => normalizePrizeImageUrls(prize), [prize]);
  const hasRealImages = galleryImageUrls.length > 0;
  const displayImageUrls = hasRealImages ? galleryImageUrls : ['/placeholder.svg'];
  const hasMultipleImages = hasRealImages && displayImageUrls.length > 1;

  const coverImageIndex = getSafeImageIndex(prize.coverImageIndex ?? 0, displayImageUrls.length);
  const activeImageUrl = displayImageUrls[activeImageIndex] || displayImageUrls[0];
  const currentModalImageUrl = displayImageUrls[modalImageIndex] || displayImageUrls[0];

  useEffect(() => {
    setActiveImageIndex(coverImageIndex);
    setModalImageIndex(coverImageIndex);
  }, [prize.id, coverImageIndex]);

  useEffect(() => {
    setImageLoaded(false);
  }, [activeImageUrl]);

  // Record one item-view event per card render (deduped per session in
  // memory, and per (item, viewer, day) by the backend).
  const trackView = useViewTracker();
  useEffect(() => {
    trackView(prize.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prize.id]);

  useEffect(() => {
    if (!showImageModal || !hasMultipleImages) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setModalImageIndex(prev => {
          const next = (prev - 1 + displayImageUrls.length) % displayImageUrls.length;
          setActiveImageIndex(next);
          return next;
        });
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setModalImageIndex(prev => {
          const next = (prev + 1) % displayImageUrls.length;
          setActiveImageIndex(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showImageModal, hasMultipleImages, displayImageUrls.length]);

  const setSelectedImage = (index: number) => {
    const safeIndex = getSafeImageIndex(index, displayImageUrls.length);
    setActiveImageIndex(safeIndex);
    setModalImageIndex(safeIndex);
  };

  const goToPreviousImage = (event?: { stopPropagation: () => void }) => {
    event?.stopPropagation();
    if (!hasMultipleImages) {
      return;
    }

    setSelectedImage((activeImageIndex - 1 + displayImageUrls.length) % displayImageUrls.length);
  };

  const goToNextImage = (event?: { stopPropagation: () => void }) => {
    event?.stopPropagation();
    if (!hasMultipleImages) {
      return;
    }

    setSelectedImage((activeImageIndex + 1) % displayImageUrls.length);
  };

  const goToPreviousModalImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setModalImageIndex(prev => {
      const next = (prev - 1 + displayImageUrls.length) % displayImageUrls.length;
      setActiveImageIndex(next);
      return next;
    });
  };

  const goToNextModalImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setModalImageIndex(prev => {
      const next = (prev + 1) % displayImageUrls.length;
      setActiveImageIndex(next);
      return next;
    });
  };

  const handleInlineTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    inlineTouchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleInlineTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) {
      inlineTouchStartXRef.current = null;
      return;
    }

    const startX = inlineTouchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    inlineTouchStartXRef.current = null;

    if (startX === null || typeof endX !== 'number') {
      return;
    }

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return;
    }

    suppressNextInlineOpenRef.current = true;
    window.setTimeout(() => {
      suppressNextInlineOpenRef.current = false;
    }, SWIPE_SUPPRESS_CLICK_MS);

    if (deltaX > 0) {
      goToPreviousImage();
    } else {
      goToNextImage();
    }
  };

  const handleInlineTouchCancel = () => {
    inlineTouchStartXRef.current = null;
  };

  const handleModalTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    modalTouchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleModalTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) {
      modalTouchStartXRef.current = null;
      return;
    }

    const startX = modalTouchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    modalTouchStartXRef.current = null;

    if (startX === null || typeof endX !== 'number') {
      return;
    }

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return;
    }

    if (deltaX > 0) {
      goToPreviousModalImage();
    } else {
      goToNextModalImage();
    }
  };

  const handleModalTouchCancel = () => {
    modalTouchStartXRef.current = null;
  };

  const handleOpenImageModal = () => {
    if (suppressNextInlineOpenRef.current) {
      suppressNextInlineOpenRef.current = false;
      return;
    }

    if (!hasRealImages) {
      return;
    }

    setModalImageIndex(activeImageIndex);
    setShowImageModal(true);
  };

  const canBuy = prize.purchaseOption === 'buy_only' || prize.purchaseOption === 'both';
  const canOffer = prize.purchaseOption === 'offers_only' || prize.purchaseOption === 'both';
  const isOutOfStock = !prize.stock || prize.stock === 0;

  // Amount is always stored in CadeCoins (50 coins = $1 USD)
  const priceInUSD = prize.amount
    ? (prize.amount / 50).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';
  const estimatedRewardCadeCoins = useMemo(() => {
    if (!canBuy || !prize.amount) return 0;

    const shippingUsd = Number(prize.shippingCostUsd ?? 0);
    const transactionSubtotalCents = Math.round((prize.amount / 50 + shippingUsd) * 100);
    return Math.round((transactionSubtotalCents * 3) / 10000);
  }, [canBuy, prize.amount, prize.shippingCostUsd]);

  // Pro-only gating: item is locked for non-Pro users
  const { session } = useAuthContext();
  const addToCart = useAddToCart();
  const isProUser = !!session?.isProSubscriber;
  const isAdminUser = session?.role === 'admin';
  // Owner detection: if the current user is the seller of this item, show an Edit
  // shortcut instead of Buy/Make Offer buttons (you can't buy your own item).
  // The session shape is inconsistent across the app: sometimes the current user's
  // id lives at `session.user.id` and sometimes at `session.id` (see Inbox.tsx),
  // so we accept either. We also fall back to comparing usernames because some
  // shop pages don't propagate the seller user id on every item, and some code
  // paths fall back `createdBy` to the literal string 'cardcade'.
  const sessionUserId = session?.user?.id || session?.id || null;
  const sessionUsername = (session?.user?.username || (session as any)?.username || '')
    .toString()
    .toLowerCase();
  const prizeCreatorId = prize.createdBy ?? null;
  const prizeCreatorUsername = prize.createdByUsername?.toLowerCase() ?? null;
  const isOwnItem =
    !!sessionUserId &&
    ((!!prizeCreatorId && prizeCreatorId !== 'cardcade' && prizeCreatorId === sessionUserId) ||
      (!!sessionUsername &&
        !!prizeCreatorUsername &&
        prizeCreatorUsername !== 'cardcade' &&
        prizeCreatorUsername === sessionUsername));
  const editHref = `/seller/shop/manage?editItemId=${prize.id}`;
  const isProLocked = useMemo(() => {
    if (isProUser) return false;
    if (prize.isProOnly) return true;
    if (prize.proEarlyAccessUntil && new Date(prize.proEarlyAccessUntil) > new Date()) return true;
    return false;
  }, [isProUser, prize.isProOnly, prize.proEarlyAccessUntil]);
  const isDisabled = isOutOfStock || isProLocked;

  const ebayFeatureFlagsQuery = useQuery({
    queryKey: ['ebay-feature-flags'],
    queryFn: () => prizeAPI.getEbayFeatureFlags(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const ebaySoldAvgEnabled = ebayFeatureFlagsQuery.data?.ebaySoldAvgEnabled ?? true;
  const ebaySoldAvgAdminOnly = ebayFeatureFlagsQuery.data?.ebaySoldAvgAdminOnly ?? false;
  const ebayManualSyncEnabled = ebayFeatureFlagsQuery.data?.ebayManualSyncEnabled ?? true;

  // Determine if eBay box should render (for layout consistency)
  const shouldShowEbayBox = isAdminUser
    ? ebaySoldAvgEnabled
    : ebaySoldAvgEnabled && !ebaySoldAvgAdminOnly;

  // Early-access countdown: only for items with a timed window (not permanently pro-only)
  const earlyAccessDate = !prize.isProOnly ? prize.proEarlyAccessUntil : null;
  const { timeLeft: earlyAccessTimeLeft } = useCountdown(earlyAccessDate);
  const hasEarlyAccessTimer = !!earlyAccessTimeLeft;

  const marketSummaryQuery = useQuery({
    queryKey: ['ebay-market-summary', prize.id],
    queryFn: () => prizeAPI.getEbayMarketSummary(prize.id),
    enabled: shouldShowEbayBox || showMarketModal || (isAdminUser && ebayManualSyncEnabled),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const marketHistoryQuery = useQuery({
    queryKey: ['ebay-market-history', prize.id],
    queryFn: () => prizeAPI.getEbayMarketHistory(prize.id, 5),
    enabled: showMarketModal,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const marketSummary = marketSummaryQuery.data;

  // Determine if actual eBay data should be displayed (vs "Coming Soon")
  // "Hide eBay avg" overrides everything (even for admins)
  const canShowEbayData =
    (prize.showEbayAvgPublicly ?? false) &&
    (isAdminUser || (marketSummaryQuery.data?.totalValidSoldCount ?? 0) > 0);

  const handleManualMarketSync = async () => {
    if (!isAdminUser) {
      return;
    }

    setSyncingMarketData(true);
    try {
      const result = await prizeAPI.syncEbaySoldListingsNow(prize.id);
      toast({
        title: 'Sold data refreshed',
        description: `Fetched ${result.fetched}, inserted ${result.inserted}, deduped ${result.deduped}, auto-flagged ${result.autoFlagged}`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ebay-market-summary', prize.id] }),
        queryClient.invalidateQueries({ queryKey: ['ebay-market-history', prize.id] }),
      ]);
      if (!showMarketModal) {
        setShowMarketModal(true);
      }
    } catch (_error) {
      toast({
        title: 'Sync failed',
        description: 'Unable to refresh sold listings right now.',
        variant: 'destructive',
      });
    } finally {
      setSyncingMarketData(false);
    }
  };

  const handleOpenSoldListingPreview = (imageUrl: string | null, soldTitle: string) => {
    if (!imageUrl) {
      return;
    }

    const fullResolutionUrl = resolveEbayFullResolutionImageUrl(imageUrl);
    setSoldListingPreview({
      activeUrl: fullResolutionUrl,
      thumbnailUrl: imageUrl,
      fullResolutionUrl,
      soldTitle,
    });
  };

  // ── Redemption variant (prod-style landscape card) ───────────────────────
  if (variant === 'redemption') {
    return (
      <FeaturedBetCard>
        <div className="p-6 flex flex-col h-full">
          {hasRealImages && (
            <div className="w-full border-t pt-2 md:pt-4">
              <div
                className="relative w-full rounded bg-black flex items-center justify-center cursor-pointer"
                onClick={handleOpenImageModal}
                onTouchStart={handleInlineTouchStart}
                onTouchEnd={handleInlineTouchEnd}
                onTouchCancel={handleInlineTouchCancel}
              >
                <img
                  src={activeImageUrl}
                  alt={prize.name}
                  className="w-full rounded object-contain max-h-64"
                  loading="lazy"
                />

                {hasMultipleImages && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute left-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 border border-[#7AFF14] md:inline-flex"
                      onClick={goToPreviousImage}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 border border-[#7AFF14] md:inline-flex"
                      onClick={goToNextImage}
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <div className="absolute top-2 left-2 rounded bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {activeImageIndex + 1}/{displayImageUrls.length}
                    </div>

                    <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/65 px-2 py-1">
                      {displayImageUrls.map((_, index) => (
                        <button
                          key={`${prize.id}-redemption-dot-${index}`}
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            setSelectedImage(index);
                          }}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full border border-[#7AFF14] transition-all',
                            index === activeImageIndex ? 'bg-white' : 'bg-transparent'
                          )}
                          aria-label={`View image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <h3 className="font-semibold text-lg mb-1 mt-2">{prize.name}</h3>
          {prize.description && (
            <p className="text-sm text-muted-foreground mb-2">{prize.description}</p>
          )}
          {typeof prize.amount === 'number' && canBuy && (
            <p className="text-sm mb-2">
              <span className="text-primary font-semibold">
                {prize.amount.toLocaleString('en-US')} CadeCoins
              </span>
              <span className="text-muted-foreground"> • </span>
              <span className="text-green-500 font-semibold">
                ${(prize.amount / 50).toFixed(2)} USD
              </span>
            </p>
          )}
          {shouldShowEbayBox && (
            <button
              type="button"
              className={`w-full rounded-md border border-[#2A2F3A] bg-[#11151d] px-3 py-2 text-center transition-colors ${
                canShowEbayData && !marketSummaryQuery.isLoading
                  ? 'hover:border-[#7AFF14]/50 cursor-pointer'
                  : 'cursor-not-allowed opacity-75'
              }`}
              onClick={e => {
                e.stopPropagation();
                if (canShowEbayData) {
                  setShowMarketModal(true);
                }
              }}
            >
              <div className="text-sm font-medium text-white">
                {marketSummaryQuery.isLoading ? (
                  <span className="text-muted-foreground">Loading eBay sales...</span>
                ) : canShowEbayData ? (
                  'See recent eBay sales'
                ) : (
                  <span className="text-muted-foreground">eBay data coming soon</span>
                )}
              </div>
            </button>
          )}
          {isAdminUser && ebayManualSyncEnabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-[#7AFF14]/40 text-[#7AFF14] hover:bg-[#7AFF14]/10"
              disabled={syncingMarketData}
              onClick={e => {
                e.stopPropagation();
                void handleManualMarketSync();
              }}
            >
              {syncingMarketData ? 'Fetching sold data...' : 'Fetch Sold Data Now'}
            </Button>
          )}
          {typeof prize.stock === 'number' && (
            <p className="text-xs text-muted-foreground mb-4">
              Stock: {prize.stock} {prize.stock === 1 ? 'item' : 'items'}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-auto">
            {!hideButtons && isOwnItem && (
              <Button
                asChild
                variant="outline"
                className="flex-1 gap-2 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                type="button"
                tabIndex={0}
              >
                <Link to={editHref} onClick={e => e.stopPropagation()}>
                  <Pencil className="w-4 h-4" />
                  Edit Item
                </Link>
              </Button>
            )}
            {!hideButtons && !isOwnItem && canBuy && (
              <Button
                className="flex-1 gap-2"
                type="button"
                tabIndex={0}
                disabled={isDisabled}
                onClick={e => {
                  e.stopPropagation();
                  onClick(prize);
                }}
              >
                {isProLocked && <Crown className="w-4 h-4" />}
                <ShoppingCart className="w-4 h-4" />
                {isProLocked ? 'Pro Only' : 'Buy Now'}
              </Button>
            )}
            {!hideButtons && !isOwnItem && canOffer && onOfferClick && (
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-transparent border-[#D4FF00] text-[#D4FF00] hover:bg-[#D4FF00]/10 hover:text-[#D4FF00]"
                type="button"
                tabIndex={0}
                disabled={isDisabled}
                onClick={e => {
                  e.stopPropagation();
                  onOfferClick(prize);
                }}
              >
                <DollarSign className="w-4 h-4" />
                Make Offer
              </Button>
            )}
          </div>
        </div>
      </FeaturedBetCard>
    );
  }

  // ── Shop variant (default stag-style portrait card) ──────────────────────
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group h-full"
    >
      <Card
        className={cn(
          'h-full flex flex-col overflow-hidden transition-all duration-200 rounded-xl',
          'relative bg-card-grid-bg border border-card-grid-border shadow-[0px_2px_8px_0px_rgba(0,0,0,0.5)]',
          'hover:border-card-grid-border-hover hover:shadow-[0px_4px_16px_0px_rgba(189,255,0,0.1)]',
          isOutOfStock && 'opacity-60'
        )}
      >
        <CardHeader className="p-0 relative">
          {/* Prize Image */}
          <div
            className="relative w-full aspect-[4/5] overflow-hidden bg-black group/image flex items-center justify-center cursor-pointer"
            onClick={handleOpenImageModal}
            onTouchStart={handleInlineTouchStart}
            onTouchEnd={handleInlineTouchEnd}
            onTouchCancel={handleInlineTouchCancel}
          >
            {!imageLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={activeImageUrl}
              alt={prize.name}
              className={`max-w-[90%] max-h-full object-contain transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />

            {hasMultipleImages && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute left-2 top-1/2 z-20 hidden h-6 w-6 -translate-y-1/2 border border-[#7AFF14] md:inline-flex"
                  onClick={goToPreviousImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-1/2 z-20 hidden h-6 w-6 -translate-y-1/2 border border-[#7AFF14] md:inline-flex"
                  onClick={goToNextImage}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <div className="absolute top-2 left-2 z-20 rounded bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {activeImageIndex + 1}/{displayImageUrls.length}
                </div>

                <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/65 px-2 py-1">
                  {displayImageUrls.map((_, index) => (
                    <button
                      key={`${prize.id}-shop-dot-${index}`}
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        setSelectedImage(index);
                      }}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full border border-[#7AFF14] transition-all',
                        index === activeImageIndex ? 'bg-white' : 'bg-transparent'
                      )}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Expand to Fullscreen Button */}
            <div className="absolute top-2 left-2 z-10 bg-black/60 rounded-md p-1.5 hover:bg-black/80 transition-colors pointer-events-none opacity-0 group-hover/image:opacity-100">
              <Expand className="h-4 w-4 text-white" aria-hidden="true" />
            </div>

            {/* Stock Badge */}
            {isOutOfStock && (
              <Badge variant="destructive" className="absolute top-2 right-2 font-semibold">
                Out of Stock
              </Badge>
            )}
            {/* Pro-Only Badge */}
            {!isOutOfStock && isProLocked && (
              <Badge className="absolute top-2 right-2 font-semibold bg-yellow-500/90 text-black border-yellow-400 gap-1">
                <Crown className="w-3 h-3" />
                {hasEarlyAccessTimer ? earlyAccessTimeLeft : 'Pro Only'}
              </Badge>
            )}
            {/* Pro crown for Pro users too (just visual indicator) */}
            {!isOutOfStock &&
              !isProLocked &&
              (prize.isProOnly ||
                (prize.proEarlyAccessUntil &&
                  new Date(prize.proEarlyAccessUntil) > new Date())) && (
                <Badge className="absolute top-2 right-2 font-semibold bg-yellow-500/90 text-black border-yellow-400 gap-1">
                  <Crown className="w-3 h-3" />
                  {hasEarlyAccessTimer ? earlyAccessTimeLeft : 'Pro'}
                </Badge>
              )}

            {/* Watchlist heart + share link + message seller (own items can't be watched/messaged but can still be shared) */}
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5">
              <ShareItemButton
                itemId={prize.id}
                shopUsername={prize.createdByUsername ?? null}
                overlay
                size="sm"
              />
              {!isOwnItem && prize.createdBy && (
                <MessageSellerButton
                  itemId={prize.id}
                  itemName={prize.name}
                  sellerId={prize.createdBy}
                  sellerName={prize.sellerDisplayName ?? prize.createdByUsername ?? null}
                  shopUsername={prize.createdByUsername ?? null}
                  overlay
                  size="sm"
                />
              )}
              {!isOwnItem && (
                <WatchButton
                  itemId={prize.id}
                  initialIsWatching={!!prize.isWatching}
                  initialWatcherCount={prize.watcherCount ?? 0}
                  overlay
                  size="sm"
                />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 flex-1 flex flex-col gap-1.5">
          {/* Prize Name */}
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[38px]">
            {prize.name}
          </h3>

          {/* Description */}
          {prize.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{prize.description}</p>
          )}

          {/* Shop Name Link */}
          {prize.createdByUsername && prize.sellerDisplayName && (
            <Link
              to={`/shop/${prize.createdByUsername}`}
              className="text-xs text-primary hover:underline transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {prize.sellerDisplayName}
            </Link>
          )}

          {/* Price */}
          <div className="mt-1">
            {canBuy ? (
              <div className="space-y-0.5">
                <span className="text-xl font-bold text-primary">${priceInUSD}</span>
                {estimatedRewardCadeCoins > 0 && (
                  <div className="text-xs font-medium text-green-500">
                    Earn {estimatedRewardCadeCoins.toLocaleString('en-US')} CadeCoins
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-semibold text-muted-foreground">Offers Only</div>
            )}
          </div>

          {shouldShowEbayBox && (
            <button
              type="button"
              className={`mt-1 rounded-md border border-[#2A2F3A] bg-[#11151d] px-3 py-2 text-center transition-colors ${
                canShowEbayData && !marketSummaryQuery.isLoading
                  ? 'hover:border-[#7AFF14]/50 cursor-pointer'
                  : 'cursor-not-allowed opacity-75'
              }`}
              onClick={e => {
                e.stopPropagation();
                if (canShowEbayData) {
                  setShowMarketModal(true);
                }
              }}
            >
              <div className="text-sm font-medium text-white">
                {marketSummaryQuery.isLoading ? (
                  <span className="text-muted-foreground">Loading eBay sales...</span>
                ) : canShowEbayData ? (
                  'See recent eBay sales'
                ) : (
                  <span className="text-muted-foreground">eBay data coming soon</span>
                )}
              </div>
            </button>
          )}
          {isAdminUser && ebayManualSyncEnabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-[#7AFF14]/40 text-[#7AFF14] hover:bg-[#7AFF14]/10"
              disabled={syncingMarketData}
              onClick={e => {
                e.stopPropagation();
                void handleManualMarketSync();
              }}
            >
              {syncingMarketData ? 'Fetching sold data...' : 'Fetch Sold Data Now'}
            </Button>
          )}

          {/* Spacer to push stock/engagement stats to bottom */}
          <div className="flex-1" />

          {/* Stock Count */}
          {typeof prize.stock === 'number' && (
            <p className="text-[10px] text-muted-foreground">
              Stock: {prize.stock} {prize.stock === 1 ? 'item' : 'items'}
            </p>
          )}

          {/* Engagement stats */}
          {((prize.viewCount ?? 0) > 0 || (prize.watcherCount ?? 0) > 0) && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {prize.viewCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {prize.watcherCount ?? 0}
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-3 pt-0 flex flex-wrap gap-2">
          {!hideButtons && isOwnItem && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 min-w-0 h-8 text-xs gap-1.5 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Link to={editHref} onClick={e => e.stopPropagation()}>
                <Pencil className="w-3.5 h-3.5" />
                Edit Item
              </Link>
            </Button>
          )}
          {!hideButtons && !isOwnItem && canBuy && (
            <Button
              variant="default"
              size="sm"
              className={cn(
                'flex-1 min-w-0 h-8 text-xs whitespace-nowrap',
                isProLocked
                  ? 'bg-yellow-500/80 text-black hover:bg-yellow-500/70'
                  : 'bg-primary text-black hover:bg-primary/90'
              )}
              onClick={e => {
                e.stopPropagation();
                onClick(prize);
              }}
              disabled={isDisabled}
            >
              {isProLocked ? (
                <>
                  <Crown className="w-3.5 h-3.5 mr-1" />
                  {hasEarlyAccessTimer ? earlyAccessTimeLeft : 'Pro Only'}
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                  Buy Now
                </>
              )}
            </Button>
          )}
          {!hideButtons && !isOwnItem && (canBuy || canOffer) && !isProLocked && session && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 flex-shrink-0 border-primary/30 hover:bg-primary/10"
              onClick={e => {
                e.stopPropagation();
                addToCart.mutate({ prizeConfigurationId: prize.id });
              }}
              disabled={isDisabled || addToCart.isPending}
              title="Add to Cart"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </Button>
          )}
          {!hideButtons && !isOwnItem && canOffer && onOfferClick && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                // When the item supports both Buy Now AND Make Offer the
                // top row is already full (Buy Now + cart icon), so the
                // offer button takes its own full-width row beneath them.
                // For offers-only listings we let it sit inline with the
                // cart icon as before.
                'gap-1.5 bg-transparent border-[#D4FF00] text-[#D4FF00] hover:bg-[#D4FF00]/10 hover:text-[#D4FF00] h-8 text-xs whitespace-nowrap',
                canBuy ? 'basis-full w-full' : 'flex-1 min-w-0'
              )}
              onClick={e => {
                e.stopPropagation();
                onOfferClick(prize);
              }}
              disabled={isDisabled}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Make Offer
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Fullscreen Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogTitle className="sr-only">Prize Image</DialogTitle>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-4 border-0 bg-transparent flex items-center justify-center pointer-events-none"
          aria-describedby={undefined}
          hideCloseButton={true}
        >
          <motion.div
            className="relative pointer-events-auto"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            whileTap={{ cursor: 'grabbing' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onDragEnd={(e, info) => {
              // Close modal if dragged down more than 100px
              if (info.offset.y > 100) {
                setShowImageModal(false);
              }
            }}
          >
            {/* Drag Indicator - subtle hint for mobile users */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 md:hidden">
              <div className="w-12 h-1 bg-white rounded-full" />
              <span className="text-xs text-white">Swipe down to close</span>
            </div>

            {/* Custom Close Button - positioned on image */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-3 -right-3 z-50 hidden rounded-full border border-[#7AFF14] bg-black/80 p-2 transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-white md:block"
              aria-label="Close image"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            <div
              className="flex items-center justify-center gap-2 sm:gap-3"
              onTouchStart={handleModalTouchStart}
              onTouchEnd={handleModalTouchEnd}
              onTouchCancel={handleModalTouchCancel}
            >
              {hasMultipleImages && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="hidden h-9 w-9 shrink-0 border border-[#7AFF14] md:inline-flex md:h-10 md:w-10"
                  onClick={goToPreviousModalImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <img
                src={currentModalImageUrl}
                alt={prize.name}
                className={cn(
                  'block max-h-[90vh] object-contain rounded-lg select-none',
                  hasMultipleImages
                    ? 'max-w-[calc(95vw-6rem)] sm:max-w-[calc(95vw-7rem)]'
                    : 'max-w-full'
                )}
              />

              {hasMultipleImages && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="hidden h-9 w-9 shrink-0 border border-[#7AFF14] md:inline-flex md:h-10 md:w-10"
                  onClick={goToNextModalImage}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>

            {hasMultipleImages && (
              <div className="absolute -bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1">
                {displayImageUrls.map((_, index) => (
                  <button
                    key={`${prize.id}-modal-dot-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'h-2 w-2 rounded-full border border-[#7AFF14] transition-all',
                      index === modalImageIndex ? 'bg-white' : 'bg-transparent'
                    )}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Market Data Modal */}
      <Dialog open={showMarketModal} onOpenChange={setShowMarketModal}>
        <DialogContent className="max-w-2xl bg-[#0D0D0D] border-[#1E242E]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Recent eBay Sales: {prize.name}</DialogTitle>
            {isAdminUser && ebayManualSyncEnabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-[#7AFF14]/40 text-[#7AFF14] hover:bg-[#7AFF14]/10"
                disabled={syncingMarketData}
                onClick={() => {
                  void handleManualMarketSync();
                }}
              >
                {syncingMarketData ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  'Fetch Sold Data Now'
                )}
              </Button>
            )}
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {marketHistoryQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#7AFF14]" />
                <span className="ml-2 text-sm text-muted-foreground">Loading sold listings...</span>
              </div>
            ) : (marketHistoryQuery.data?.listings?.length ?? 0) > 0 ? (
              <>
                {/* High/Avg/Low Price Summary */}
                {(() => {
                  const listings = marketHistoryQuery.data?.listings ?? [];
                  const prices = listings.map(l => l.salePrice).filter(p => Number.isFinite(p));
                  const highPrice = prices.length > 0 ? Math.max(...prices) : null;
                  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
                  const avgPrice =
                    prices.length > 0
                      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
                      : null;

                  return prices.length > 0 ? (
                    <div className="rounded-md border border-[#2A2F3A] bg-[#121722] px-4 py-3">
                      <div className="flex items-center justify-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">High: </span>
                          <span className="font-semibold text-[#7AFF14]">
                            ${highPrice?.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-muted-foreground">•</div>
                        <div>
                          <span className="text-muted-foreground">Avg: </span>
                          <span className="font-semibold text-[#7AFF14]">
                            ${avgPrice?.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-muted-foreground">•</div>
                        <div>
                          <span className="text-muted-foreground">Low: </span>
                          <span className="font-semibold text-[#7AFF14]">
                            ${lowPrice?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Sold Listings */}
                <div className="space-y-2">
                  {(marketHistoryQuery.data?.listings ?? []).map(row => (
                    <div key={row.id} className="rounded border border-[#2A2F3A] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {row.imageUrl ? (
                            <button
                              type="button"
                              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded border border-[#2A2F3A] bg-[#0B1018]"
                              onClick={() =>
                                handleOpenSoldListingPreview(row.imageUrl, row.soldTitle)
                              }
                              aria-label={`Open full image for ${row.soldTitle}`}
                            >
                              <img
                                src={row.imageUrl}
                                alt={row.soldTitle}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                loading="lazy"
                              />
                              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                                <Expand className="h-4 w-4 text-white" aria-hidden="true" />
                              </span>
                            </button>
                          ) : (
                            <div className="h-16 w-16 shrink-0 rounded border border-[#2A2F3A] bg-[#0B1018]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-white line-clamp-2 mb-1">
                              {row.soldTitle}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="text-[#7AFF14] font-semibold">
                                ${row.salePrice.toFixed(2)}
                              </span>
                              {row.dateSold
                                ? ` • ${new Date(row.dateSold).toLocaleDateString()}`
                                : ''}
                              {row.itemCondition ? ` • ${row.itemCondition}` : ''}
                            </div>
                          </div>
                        </div>
                        {row.listingUrl && (
                          <a
                            href={row.listingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs text-[#7AFF14] hover:underline font-medium"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No recent eBay sales found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sold Listing Image Modal */}
      <Dialog open={!!soldListingPreview} onOpenChange={() => setSoldListingPreview(null)}>
        <DialogTitle className="sr-only">Sold Listing Image Preview</DialogTitle>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-4 border-0 bg-transparent flex items-center justify-center pointer-events-none"
          aria-describedby={undefined}
          hideCloseButton={true}
        >
          {soldListingPreview && (
            <motion.div
              className="relative pointer-events-auto"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              whileTap={{ cursor: 'grabbing' }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onDragEnd={(e, info) => {
                // Close modal if dragged down more than 100px
                if (info.offset.y > 100) {
                  setSoldListingPreview(null);
                }
              }}
            >
              {/* Drag Indicator - subtle hint for mobile users */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 md:hidden">
                <div className="w-12 h-1 bg-white rounded-full" />
                <span className="text-xs text-white">Swipe down to close</span>
              </div>

              {/* Custom Close Button - positioned on image */}
              <button
                onClick={() => setSoldListingPreview(null)}
                className="absolute -top-3 -right-3 z-50 hidden rounded-full border border-[#7AFF14] bg-black/80 p-2 transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-white md:block"
                aria-label="Close image"
              >
                <X className="h-6 w-6 text-white" />
              </button>

              <img
                src={soldListingPreview.activeUrl}
                alt={soldListingPreview.soldTitle}
                className="block max-h-[90vh] max-w-full object-contain rounded-lg select-none"
                onError={() => {
                  setSoldListingPreview(prev => {
                    if (!prev || prev.activeUrl === prev.thumbnailUrl) {
                      return prev;
                    }

                    return {
                      ...prev,
                      activeUrl: prev.thumbnailUrl,
                    };
                  });
                }}
              />
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
