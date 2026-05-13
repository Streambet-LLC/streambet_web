import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Gavel,
  Clock,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Eye,
  Heart,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
  Expand,
  Loader2,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getThumbnailUrl } from '@/utils/helper';
import { cn } from '@/lib/utils';
import WatchButton from './WatchButton';
import ShareItemButton from './ShareItemButton';
import AuctionBidModal from './AuctionBidModal';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import useAuctionSocket from '@/hooks/useAuctionSocket';
import { useViewTracker } from '@/hooks/useViewTracker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { prizeAPI } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import type { AuctionSummary } from '@/types/prize';
import type { Prize } from './PrizesByCategory';

interface AuctionCardProps {
  prize: Prize & { auction: AuctionSummary };
  isFeatured?: boolean;
}

const formatRemaining = (msLeft: number): string => {
  if (msLeft <= 0) return 'Ending now';
  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const resolveEbayFullResolutionImageUrl = (thumbnailUrl: string): string => {
  // eBay thumbnail URLs contain sizing params like 's-l225.jpg' or 's-l140.jpg'
  // Replace with 's-l1600.jpg' for higher resolution
  return thumbnailUrl.replace(/s-l\d+\.jpg/, 's-l1600.jpg');
};

/**
 * Auction-specific card. Mirrors PrizeCard's outer shape but emphasises:
 *   - current bid (large) and minimum next bid
 *   - live countdown to endsAt (ticks every second)
 *   - bid count + reserve indicator
 *   - "Place a bid" CTA that opens AuctionBidModal
 *
 * Subscribes to live updates via useAuctionSocket so the bid amount and
 * countdown stay in sync without a refresh.
 */
export default function AuctionCard({ prize }: AuctionCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMyBidsPage = location.pathname === '/my-bids';
  // Hydrate the auction summary from the live endpoint so we always have
  // up-to-date isLeader / isBidder fields for the current viewer.
  const auctionQuery = useQuery({
    queryKey: ['auction', prize.auction.id],
    queryFn: () => api.auction.getById(prize.auction.id),
    initialData: prize.auction,
    staleTime: 15_000,
  });

  const auction = auctionQuery.data ?? prize.auction;
  const [isBidOpen, setIsBidOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [syncingMarketData, setSyncingMarketData] = useState(false);
  const [soldListingPreview, setSoldListingPreview] = useState<{
    activeUrl: string;
    thumbnailUrl: string;
    fullResolutionUrl: string;
    soldTitle: string;
  } | null>(null);

  const queryClient = useQueryClient();

  // Self-bid guard: sellers can't bid on their own item. Mirrors PrizeCard's
  // owner detection — backend also enforces in placeBid().
  const { session } = useAuthContext();
  const sessionUserId = session?.user?.id || (session as { id?: string } | null)?.id || null;
  const sessionUsername = (
    session?.user?.username ||
    (session as { username?: string } | null)?.username ||
    ''
  )
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

  const isAdminUser = session?.role === 'admin';

  // eBay feature flags
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
    : (ebaySoldAvgEnabled && !ebaySoldAvgAdminOnly);

  // eBay market data
  const marketSummaryQuery = useQuery({
    queryKey: ['ebay-market-summary', prize.id],
    queryFn: () => prizeAPI.getEbayMarketSummary(prize.id),
    enabled: shouldShowEbayBox || showMarketModal,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // Determine if actual eBay data should be displayed (vs "Coming Soon")
  // Check both configuration AND if there's actual data available
  const canShowEbayData = isAdminUser
    ? true
    : (prize.showEbayAvgPublicly ?? false) && 
      (marketSummaryQuery.data?.totalValidSoldCount ?? 0) > 0;

  const marketHistoryQuery = useQuery({
    queryKey: ['ebay-market-history', prize.id],
    queryFn: () => prizeAPI.getEbayMarketHistory(prize.id, 5),
    enabled: showMarketModal,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const marketSummary = marketSummaryQuery.data;
  const latestAvg = marketSummary?.averagePrice ?? null;
  const cardLastCalculated =
    marketSummary?.lastCalculatedAt || prize.ebayMarketLastCalculatedAt || null;

  const handleBidClick = () => {
    if (!session) {
      const redirect = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    setIsBidOpen(true);
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

  useAuctionSocket({ auctionId: auction.id });
  const trackView = useViewTracker();
  useEffect(() => {
    trackView(prize.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prize.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const endsAtMs = new Date(auction.endsAt).getTime();
  const msLeft = endsAtMs - now;
  const isEnded =
    msLeft <= 0 || ['ended', 'paid', 'unsold', 'failed', 'cancelled'].includes(auction.status);
  const isUrgent = !isEnded && msLeft <= 60 * 60 * 1000; // <1h
  const shouldCheckRetryPayment =
    isMyBidsPage &&
    !isOwnItem &&
    isEnded &&
    auction.bidCount > 0 &&
    !['unsold', 'cancelled', 'paid'].includes(auction.status);

  const retryPaymentQuery = useQuery({
    queryKey: ['auction-payment-status', auction.id],
    queryFn: () => api.auction.getPaymentStatus(auction.id),
    enabled: shouldCheckRetryPayment,
    retry: false,
    staleTime: 30_000,
  });

  const canRetryPayment =
    retryPaymentQuery.data?.canRetry === true && retryPaymentQuery.data?.status !== 'PAID';

  // Multi-image carousel: dedupe + thumbnail-normalize the prize's image list,
  // falling back to the single `imageUrl` when `imageUrls` is empty.
  const galleryUrls = useMemo<string[]>(() => {
    const seen: string[] = [];
    (prize.imageUrls || []).forEach(u => {
      const trimmed = typeof u === 'string' ? u.trim() : '';
      if (!trimmed) return;
      const normalized = getThumbnailUrl(trimmed);
      if (!seen.includes(normalized)) seen.push(normalized);
    });
    if (!seen.length && prize.imageUrl) seen.push(getThumbnailUrl(prize.imageUrl));
    return seen;
  }, [prize.imageUrls, prize.imageUrl]);
  const hasMultipleImages = galleryUrls.length > 1;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const safeIndex = galleryUrls.length
    ? ((activeImageIndex % galleryUrls.length) + galleryUrls.length) % galleryUrls.length
    : 0;
  const activeImageUrl = galleryUrls[safeIndex];
  const goToPreviousImage = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    setActiveImageIndex(i => (i - 1 + galleryUrls.length) % galleryUrls.length);
  };
  const goToNextImage = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    setActiveImageIndex(i => (i + 1) % galleryUrls.length);
  };

  // Swipe-to-navigate on touch devices. The inline (in-card) gallery
  // swipe is wired via NATIVE listeners further down (see inlineImageRef
  // useEffect) so we can stopPropagation and prevent the parent embla
  // carousel from initiating a slide drag. The modal/lightbox swipe still
  // uses React handlers because there's no embla competitor inside it.
  const SWIPE_THRESHOLD_PX = 40;
  const SWIPE_SUPPRESS_LIGHTBOX_MS = 350;
  const suppressLightboxRef = useRef(false);

  const modalTouchStartXRef = useRef<number | null>(null);
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
    if (startX === null || typeof endX !== 'number') return;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (deltaX > 0) goToPreviousImage();
    else goToNextImage();
  };
  const handleModalTouchCancel = () => {
    modalTouchStartXRef.current = null;
  };

  // Block embla (and any other ancestor pointer-drag handler) from
  // hijacking horizontal swipes on the inline image, AND drive our own
  // gallery-swipe gesture from the same native listeners. We MUST do
  // both here: React 17+ delegates synthetic events at the root, so
  // calling stopPropagation natively would also prevent React's
  // onTouchStart/End handlers from firing — so the swipe logic itself
  // lives in these native listeners.
  const inlineImageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = inlineImageRef.current;
    if (!node) return;

    let startX: number | null = null;
    let startY: number | null = null;
    let isHorizontal = false;

    const onTouchStart = (e: globalThis.TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      isHorizontal = false;
      // Stop propagation so embla (which listens on its viewport) doesn't
      // start a slide drag while we're swiping the gallery.
      if (hasMultipleImages) e.stopPropagation();
    };

    const onTouchMove = (e: globalThis.TouchEvent) => {
      if (startX === null || startY === null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!isHorizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        isHorizontal = true;
      }
      if (hasMultipleImages && isHorizontal) {
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e: globalThis.TouchEvent) => {
      const t = e.changedTouches[0];
      if (startX === null || !t) {
        startX = null;
        startY = null;
        return;
      }
      const dx = t.clientX - startX;
      startX = null;
      startY = null;
      if (!hasMultipleImages) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      e.stopPropagation();
      suppressLightboxRef.current = true;
      window.setTimeout(() => {
        suppressLightboxRef.current = false;
      }, SWIPE_SUPPRESS_LIGHTBOX_MS);
      if (dx > 0) goToPreviousImage();
      else goToNextImage();
    };

    const onPointerDown = (e: PointerEvent) => {
      // Stop embla from initiating a pointer-based drag on touch/pen.
      if (hasMultipleImages && e.pointerType !== 'mouse') {
        e.stopPropagation();
      }
    };

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    node.addEventListener('touchend', onTouchEnd);
    node.addEventListener('touchcancel', onTouchEnd);
    return () => {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [hasMultipleImages, galleryUrls.length]);

  const handleOpenLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!galleryUrls.length) return;
    if (suppressLightboxRef.current) return;
    setIsLightboxOpen(true);
  };

  // Keyboard navigation while lightbox is open (matches PrizeCard).
  useEffect(() => {
    if (!isLightboxOpen || !hasMultipleImages) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousImage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextImage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLightboxOpen, hasMultipleImages, galleryUrls.length]);

  const card = (
    <Card
      className={cn(
        'h-full flex flex-col overflow-hidden transition-all duration-200',
        // Match the in-shop PrizeCard styling so featured-strip auctions
        // and shop-grid auctions look identical (border, subtle bg, and
        // the same neon-green hover glow).
        'relative bg-card-grid-bg border border-card-grid-border shadow-[0px_2px_8px_0px_rgba(0,0,0,0.5)]',
        'hover:border-card-grid-border-hover hover:shadow-[0px_4px_16px_0px_rgba(189,255,0,0.1)]'
      )}
    >
      <div
        ref={inlineImageRef}
        className={cn(
          'relative aspect-[4/5] bg-black overflow-hidden touch-pan-y flex items-center justify-center',
          activeImageUrl && 'cursor-zoom-in'
        )}
        onClick={activeImageUrl ? handleOpenLightbox : undefined}
      >
        {activeImageUrl ? (
          <img
            src={activeImageUrl}
            alt={prize.name}
            className="max-w-[90%] max-h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Gavel className="w-10 h-10" />
          </div>
        )}
        {hasMultipleImages && (
          <>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 border border-[#7AFF14]"
              onClick={goToPreviousImage}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 border border-[#7AFF14]"
              onClick={goToNextImage}
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
              {safeIndex + 1}/{galleryUrls.length}
            </div>
            <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/65 px-2 py-1">
              {galleryUrls.map((_, index) => (
                <button
                  key={`${prize.id}-auction-dot-${index}`}
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setActiveImageIndex(index);
                  }}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full border border-[#7AFF14] transition-all',
                    index === safeIndex ? 'bg-white' : 'bg-transparent'
                  )}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 bg-amber-500/90 text-black border-amber-600 font-semibold flex items-center gap-1"
        >
          <Gavel className="w-3 h-3" />
          Auction
        </Badge>
        {auction.reserveMet === false && (
          <Badge
            variant="outline"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur border-amber-500 text-amber-500 flex items-center gap-1"
          >
            <ShieldAlert className="w-3 h-3" />
            Reserve not met
          </Badge>
        )}
        {auction.reserveMet === true && (
          <Badge
            variant="outline"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur border-emerald-500 text-emerald-500 flex items-center gap-1"
          >
            <ShieldCheck className="w-3 h-3" />
            Reserve met
          </Badge>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-20">
          <ShareItemButton
            itemId={prize.id}
            shopUsername={prize.createdByUsername ?? null}
            overlay
            size="sm"
          />
          <WatchButton
            itemId={prize.id}
            initialIsWatching={prize.isWatching ?? false}
            initialWatcherCount={prize.watcherCount ?? 0}
            overlay
          />
        </div>
      </div>

      <CardContent className="flex-1 flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 min-h-[40px]">{prize.name}</h3>
        </div>


        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {auction.currentBidUsd != null ? 'Current bid' : 'Starting at'}
            </span>
            <span className="text-2xl font-bold text-primary leading-none">
              ${(auction.currentBidUsd ?? auction.startingPriceUsd).toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Next bid ${auction.minNextBidUsd.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isEnded ? 'Ended' : 'Ends in'}
            </span>
            <span
              className={cn(
                'text-sm font-mono font-semibold',
                isUrgent && !isEnded ? 'text-red-500' : 'text-foreground'
              )}
            >
              {isEnded ? '—' : formatRemaining(msLeft)}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {prize.viewCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {prize.watcherCount ?? 0}
          </span>
          {auction.isLeader && (
            <Badge variant="default" className="ml-auto bg-emerald-600 hover:bg-emerald-600">
              You're winning
            </Badge>
          )}
          {!auction.isLeader && auction.isBidder && (
            <Badge variant="outline" className="ml-auto border-red-500 text-red-500">
              Outbid
            </Badge>
          )}
          {canRetryPayment && (
            <Badge variant="outline" className="ml-auto border-amber-500 text-amber-500">
              Payment retry available
            </Badge>
          )}
        </div>

        {shouldShowEbayBox && (
          <button
            type="button"
            className={`w-full rounded-md border border-[#2A2F3A] bg-[#11151d] px-3 py-2 text-center transition-colors mt-2 ${
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
                "See recent eBay sales"
              ) : (
                <span className="text-muted-foreground">eBay data coming soon</span>
              )}
            </div>
          </button>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {isOwnItem ? (
          <Button
            asChild
            variant="outline"
            className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link to={editHref} onClick={e => e.stopPropagation()}>
              <Pencil className="w-4 h-4" />
              Edit Item
            </Link>
          </Button>
        ) : canRetryPayment ? (
          <Button className="w-full" onClick={() => navigate(`/auctions/${auction.id}/retry-payment`)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Retry payment
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={isEnded || auction.status === 'cancelled'}
            onClick={handleBidClick}
          >
            <Gavel className="w-4 h-4 mr-2" />
            {isEnded ? 'Ended' : auction.isLeader ? 'Raise your max' : 'Place a bid'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="group h-full"
      >
        {card}
      </motion.div>
      <AuctionBidModal
        isOpen={isBidOpen}
        onClose={() => setIsBidOpen(false)}
        prize={{ id: prize.id, name: prize.name, imageUrl: prize.imageUrl, isInPerson: prize.isInPerson }}
        auction={auction}
      />

      {/* eBay Market Data Modal */}
      {shouldShowEbayBox && (
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
                    const avgPrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : null;
                    
                    return prices.length > 0 ? (
                      <div className="rounded-md border border-[#2A2F3A] bg-[#121722] px-4 py-3">
                        <div className="flex items-center justify-center gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">High: </span>
                            <span className="font-semibold text-[#7AFF14]">${highPrice?.toFixed(2)}</span>
                          </div>
                          <div className="text-muted-foreground">•</div>
                          <div>
                            <span className="text-muted-foreground">Avg: </span>
                            <span className="font-semibold text-[#7AFF14]">${avgPrice?.toFixed(2)}</span>
                          </div>
                          <div className="text-muted-foreground">•</div>
                          <div>
                            <span className="text-muted-foreground">Low: </span>
                            <span className="font-semibold text-[#7AFF14]">${lowPrice?.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Sold Listings */}
                  <div className="space-y-2">
                    {(marketHistoryQuery.data?.listings ?? []).map((row) => (
                      <div 
                        key={row.id} 
                        className="rounded border border-[#2A2F3A] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {row.imageUrl ? (
                              <button
                                type="button"
                                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded border border-[#2A2F3A] bg-[#0B1018]"
                                onClick={() => handleOpenSoldListingPreview(row.imageUrl, row.soldTitle)}
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
                              <div className="text-sm text-white line-clamp-2 mb-1">{row.soldTitle}</div>
                              <div className="text-xs text-muted-foreground">
                                <span className="text-[#7AFF14] font-semibold">${row.salePrice.toFixed(2)}</span>
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
      )}

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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-full max-h-full pointer-events-auto"
              onClick={(e) => {
                // Close modal when clicking the image itself (not the container)
                if (e.target === e.currentTarget) {
                  setSoldListingPreview(null);
                }
              }}
            >
              <img
                src={soldListingPreview.activeUrl}
                alt={soldListingPreview.soldTitle}
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain cursor-pointer"
                onClick={() => setSoldListingPreview(null)}
              />
              {soldListingPreview.soldTitle && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                  <p className="text-white text-sm font-medium line-clamp-2">{soldListingPreview.soldTitle}</p>
                </div>
              )}
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
