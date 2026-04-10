import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { getThumbnailUrl } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  DollarSign,
  Expand,
  X,
  ChevronLeft,
  ChevronRight,
  Crown,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Prize } from './PrizesByCategory';
import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import FeaturedBetCard from '../FeaturedBetCard';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddToCart } from '@/hooks/useCart';
import { useCountdown } from '@/hooks/use-countdown';

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

export default function PrizeCard({
  prize,
  onClick,
  onOfferClick,
  isFeatured = false,
  variant = 'shop',
  hideButtons = false,
}: PrizeCardProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [modalImageIndex, setModalImageIndex] = useState(0);
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

  // Amount is always stored in CadeCoins (50 coins = $1 USD)
  const priceInUSD = prize.amount
    ? (prize.amount / 50).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';
  const canBuy = prize.purchaseOption === 'buy_only' || prize.purchaseOption === 'both';
  const canOffer = prize.purchaseOption === 'offers_only' || prize.purchaseOption === 'both';
  const isOutOfStock = !prize.stock || prize.stock === 0;

  // Pro-only gating: item is locked for non-Pro users
  const { session } = useAuthContext();
  const addToCart = useAddToCart();
  const isProUser = !!session?.isProSubscriber;
  const isProLocked = useMemo(() => {
    if (isProUser) return false;
    if (prize.isProOnly) return true;
    if (prize.proEarlyAccessUntil && new Date(prize.proEarlyAccessUntil) > new Date()) return true;
    return false;
  }, [isProUser, prize.isProOnly, prize.proEarlyAccessUntil]);
  const isDisabled = isOutOfStock || isProLocked;

  // Early-access countdown: only for items with a timed window (not permanently pro-only)
  const earlyAccessDate = !prize.isProOnly ? prize.proEarlyAccessUntil : null;
  const { timeLeft: earlyAccessTimeLeft } = useCountdown(earlyAccessDate);
  const hasEarlyAccessTimer = !!earlyAccessTimeLeft;

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
            <p className="text-sm text-muted-foreground mb-2">
              {prize.amount.toLocaleString('en-US')} coins • ${(prize.amount / 50).toFixed(2)} USD
            </p>
          )}
          {typeof prize.stock === 'number' && (
            <p className="text-xs text-muted-foreground mb-4">
              Stock: {prize.stock} {prize.stock === 1 ? 'item' : 'items'}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-auto">
            {!hideButtons && canBuy && (
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
            {!hideButtons && canOffer && onOfferClick && (
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
            <img
              src={activeImageUrl}
              alt={prize.name}
              className="w-full h-full object-contain"
              loading="lazy"
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
          </div>
        </CardHeader>

        <CardContent className="p-3 flex-1 flex flex-col gap-1.5">
          {/* Prize Name */}
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{prize.name}</h3>

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
          <div className="mt-auto pt-1">
            {canBuy ? (
              <span className="text-xl font-bold text-primary">${priceInUSD}</span>
            ) : (
              <div className="text-sm font-semibold text-muted-foreground">Offers Only</div>
            )}
          </div>

          {/* Stock Count */}
          {typeof prize.stock === 'number' && (
            <p className="text-[10px] text-muted-foreground">
              Stock: {prize.stock} {prize.stock === 1 ? 'item' : 'items'}
            </p>
          )}
        </CardContent>

        <CardFooter className="p-3 pt-0 flex gap-2">
          {!hideButtons && canBuy && (
            <Button
              variant="default"
              size="sm"
              className={cn(
                'flex-1 h-8 text-xs',
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
          {!hideButtons && (canBuy || canOffer) && !isProLocked && session && (
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
          {!hideButtons && canOffer && onOfferClick && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 bg-transparent border-[#D4FF00] text-[#D4FF00] hover:bg-[#D4FF00]/10 hover:text-[#D4FF00] h-8 text-xs"
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
    </motion.div>
  );
}
