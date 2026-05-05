import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { getThumbnailUrl } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
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
  AlertTriangle,
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
import { useViewTracker } from '@/hooks/useViewTracker';
import WatchButton from './WatchButton';
import ShareItemButton from './ShareItemButton';
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

const PRICE_CHART_WIDTH = 620;
const PRICE_CHART_HEIGHT = 220;
const PRICE_CHART_PADDING = { top: 12, right: 12, bottom: 28, left: 52 };

const REPORT_REASON_OPTIONS = [
  { value: 'wrong-item', label: 'Wrong item' },
  { value: 'wrong-condition', label: 'Wrong condition/grade' },
  { value: 'title-mismatch', label: 'Title/description mismatch' },
  { value: 'image-mismatch', label: 'Image does not match listing' },
  { value: 'price-issue', label: 'Suspicious or unrealistic price' },
  { value: 'duplicate', label: 'Duplicate listing' },
  { value: 'other', label: 'Other' },
] as const;

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

const formatShortDate = (dateValue: string | null): string => {
  if (!dateValue) {
    return 'n/a';
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return 'n/a';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const formatChartPrice = (value: number): string => `$${value.toFixed(2)}`;

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
  const [reportDialogTarget, setReportDialogTarget] = useState<{
    listingId: string;
    soldTitle: string;
    imageUrl: string | null;
    salePrice: number;
    dateSold: string | null;
  } | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<string>('');
  const [reportReasonDetails, setReportReasonDetails] = useState('');
  const [syncingMarketData, setSyncingMarketData] = useState(false);
  const [chartWindow, setChartWindow] = useState<'7d' | '30d'>('30d');
  const [activeChartPointId, setActiveChartPointId] = useState<string | null>(null);
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
    ((!!prizeCreatorId &&
      prizeCreatorId !== 'cardcade' &&
      prizeCreatorId === sessionUserId) ||
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

  // Early-access countdown: only for items with a timed window (not permanently pro-only)
  const earlyAccessDate = !prize.isProOnly ? prize.proEarlyAccessUntil : null;
  const { timeLeft: earlyAccessTimeLeft } = useCountdown(earlyAccessDate);
  const hasEarlyAccessTimer = !!earlyAccessTimeLeft;

  const marketSummaryQuery = useQuery({
    queryKey: ['ebay-market-summary', prize.id],
    queryFn: () => prizeAPI.getEbayMarketSummary(prize.id),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const marketHistoryQuery = useQuery({
    queryKey: ['ebay-market-history', prize.id],
    queryFn: () => prizeAPI.getEbayMarketHistory(prize.id, 120),
    enabled: showMarketModal,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const marketSummary = marketSummaryQuery.data;
  const latestAvg = marketSummary?.averagePrice ?? null;
  const latestPercentDiff = marketSummary?.percentDifference ?? null;
  const cardLastCalculated =
    marketSummary?.lastCalculatedAt || prize.ebayMarketLastCalculatedAt || null;

  const chartData = useMemo(() => {
    const allRows = (marketHistoryQuery.data?.listings ?? [])
      .slice()
      .reverse()
      .filter((row) => Number.isFinite(row.salePrice));

    if (!allRows.length) {
      return null;
    }

    const now = Date.now();
    const days = chartWindow === '7d' ? 7 : 30;
    const windowMs = days * 24 * 60 * 60 * 1000;

    const filteredRows = allRows.filter((row) => {
      if (!row.dateSold) {
        return true;
      }
      const soldTs = new Date(row.dateSold).getTime();
      return Number.isFinite(soldTs) && now - soldTs <= windowMs;
    });

    const rows = filteredRows.length ? filteredRows : allRows;
    if (!rows.length) {
      return null;
    }

    const values = rows.map((row) => row.salePrice);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const sortedValues = [...values].sort((a, b) => a - b);
    const medianY =
      sortedValues.length % 2 === 0
        ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
        : sortedValues[Math.floor(sortedValues.length / 2)];

    const innerWidth = PRICE_CHART_WIDTH - PRICE_CHART_PADDING.left - PRICE_CHART_PADDING.right;
    const innerHeight = PRICE_CHART_HEIGHT - PRICE_CHART_PADDING.top - PRICE_CHART_PADDING.bottom;
    const yRange = maxY - minY || 1;
    const xRange = Math.max(rows.length - 1, 1);

    const points = rows.map((row, index) => {
      const x = PRICE_CHART_PADDING.left + (index / xRange) * innerWidth;
      const y =
        PRICE_CHART_PADDING.top +
        innerHeight -
        ((row.salePrice - minY) / yRange) * innerHeight;
      return {
        id: row.id,
        x,
        y,
        row,
      };
    });

    return {
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
      minY,
      maxY,
      medianY,
      oldestLabel: formatShortDate(rows[0]?.dateSold ?? null),
      newestLabel: formatShortDate(rows[rows.length - 1]?.dateSold ?? null),
      latestPoint: points[points.length - 1],
    };
  }, [marketHistoryQuery.data?.listings, chartWindow]);

  const activeChartPoint = useMemo(() => {
    if (!chartData) {
      return null;
    }
    return chartData.points.find((point) => point.id === activeChartPointId) ?? null;
  }, [chartData, activeChartPointId]);

  useEffect(() => {
    setActiveChartPointId(null);
  }, [chartWindow, marketHistoryQuery.data?.listings]);

  const closeReportDialog = () => {
    setReportDialogTarget(null);
    setSelectedReportReason('');
    setReportReasonDetails('');
  };

  const handleOpenReportDialog = (listing: {
    id: string;
    soldTitle: string;
    imageUrl: string | null;
    salePrice: number;
    dateSold: string | null;
  }) => {
    if (!session) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to report inaccurate market data.',
        variant: 'destructive',
      });
      return;
    }

    setReportDialogTarget({
      listingId: listing.id,
      soldTitle: listing.soldTitle,
      imageUrl: listing.imageUrl,
      salePrice: listing.salePrice,
      dateSold: listing.dateSold,
    });
  };

  const handleSubmitReport = async () => {
    if (!reportDialogTarget || !selectedReportReason) {
      return;
    }

    const selectedOption = REPORT_REASON_OPTIONS.find(
      option => option.value === selectedReportReason,
    );
    const details = reportReasonDetails.trim();
    const reason = details
      ? `${selectedOption?.label ?? 'Other'}: ${details}`
      : selectedOption?.label;

    setReportingListingId(reportDialogTarget.listingId);
    try {
      await prizeAPI.reportEbaySoldListing(reportDialogTarget.listingId, {
        reason: reason || undefined,
      });
      toast({
        title: 'Reported',
        description: 'Thanks! This listing will be hidden from your results while pending admin review.',
      });
      closeReportDialog();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ebay-market-summary', prize.id] }),
        queryClient.invalidateQueries({ queryKey: ['ebay-market-history', prize.id] }),
      ]);
    } catch (error) {
      toast({
        title: 'Unable to report listing',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setReportingListingId(null);
    }
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
        description: `Fetched ${result.fetched}, inserted ${result.inserted}, deduped ${result.deduped}`,
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
            <p className="text-sm text-muted-foreground mb-2">
              {prize.amount.toLocaleString('en-US')} coins • ${(prize.amount / 50).toFixed(2)} USD
            </p>
          )}
          <button
            type="button"
            className="w-full rounded-md border border-[#2A2F3A] bg-[#11151d] px-3 py-2 text-left transition-colors hover:border-[#7AFF14]/50"
            onClick={e => {
              e.stopPropagation();
              setShowMarketModal(true);
            }}
          >
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">eBay sold avg (latest 10)</div>
            {marketSummaryQuery.isLoading ? (
              <div className="mt-1 text-xs text-muted-foreground">Loading market data...</div>
            ) : latestAvg !== null ? (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#7AFF14]">${latestAvg.toFixed(2)}</span>
                <span
                  className={cn(
                    'text-xs font-semibold',
                    latestPercentDiff === null
                      ? 'text-muted-foreground'
                      : latestPercentDiff >= 0
                        ? 'text-orange-400'
                        : 'text-emerald-400'
                  )}
                >
                  {latestPercentDiff === null
                    ? 'n/a'
                    : `${latestPercentDiff >= 0 ? '+' : ''}${latestPercentDiff.toFixed(2)}%`}
                </span>
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">0 sold listings</div>
            )}
            <div className="mt-1 text-[10px] text-muted-foreground">
              {cardLastCalculated
                ? `Updated ${new Date(cardLastCalculated).toLocaleString()}`
                : ''}
            </div>
          </button>
          {isAdminUser && (
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
                <Link
                  to={editHref}
                  onClick={e => e.stopPropagation()}
                >
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
              className={`w-full h-full object-contain transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
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

            {/* Watchlist heart + share link (own items can't be watched but can still be shared) */}
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5">
              <ShareItemButton
                itemId={prize.id}
                shopUsername={prize.createdByUsername ?? null}
                overlay
                size="sm"
              />
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

          <button
            type="button"
            className="mt-1 rounded-md border border-[#2A2F3A] bg-[#11151d] px-2.5 py-2 text-left transition-colors hover:border-[#7AFF14]/50"
            onClick={e => {
              e.stopPropagation();
              setShowMarketModal(true);
            }}
          >
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">eBay sold avg (latest 10)</div>
            {marketSummaryQuery.isLoading ? (
              <div className="mt-1 text-[11px] text-muted-foreground">Loading market data...</div>
            ) : latestAvg !== null ? (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#7AFF14]">${latestAvg.toFixed(2)}</span>
                <span
                  className={cn(
                    'text-[11px] font-semibold',
                    latestPercentDiff === null
                      ? 'text-muted-foreground'
                      : latestPercentDiff >= 0
                        ? 'text-orange-400'
                        : 'text-emerald-400'
                  )}
                >
                  {latestPercentDiff === null
                    ? 'n/a'
                    : `${latestPercentDiff >= 0 ? '+' : ''}${latestPercentDiff.toFixed(2)}%`}
                </span>
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-muted-foreground">0 sold listings</div>
            )}
            <div className="mt-1 text-[10px] text-muted-foreground">
              {cardLastCalculated
                ? `Updated ${new Date(cardLastCalculated).toLocaleString()}`
                : ''}
            </div>
          </button>
          {isAdminUser && (
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
        <DialogContent className="max-w-3xl bg-[#0D0D0D] border-[#1E242E]">
          <DialogTitle className="text-white">Market Data: {prize.name}</DialogTitle>

          <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-[#2A2F3A] bg-[#121722] p-3">
                <div className="text-[11px] text-muted-foreground uppercase">Last 10 Sold Avg</div>
                <div className="mt-1 text-lg font-semibold text-[#7AFF14]">
                  {marketSummary?.averagePrice != null ? `$${marketSummary.averagePrice.toFixed(2)}` : '—'}
                </div>
              </div>
              <div className="rounded-md border border-[#2A2F3A] bg-[#121722] p-3">
                <div className="text-[11px] text-muted-foreground uppercase">Diff vs Listing</div>
                <div
                  className={cn(
                    'mt-1 text-lg font-semibold',
                    marketSummary?.percentDifference == null
                      ? 'text-muted-foreground'
                      : marketSummary.percentDifference >= 0
                        ? 'text-orange-400'
                        : 'text-emerald-400'
                  )}
                >
                  {marketSummary?.percentDifference == null
                    ? '—'
                    : `${marketSummary.percentDifference >= 0 ? '+' : ''}${marketSummary.percentDifference.toFixed(2)}%`}
                </div>
              </div>
              <div className="rounded-md border border-[#2A2F3A] bg-[#121722] p-3">
                <div className="text-[11px] text-muted-foreground uppercase">Last Calculated</div>
                <div className="mt-1 text-sm font-medium text-white">
                  {cardLastCalculated ? new Date(cardLastCalculated).toLocaleString() : '—'}
                </div>
              </div>
            </div>

            {marketSummary?.windows?.length ? (
              <div className="rounded-md border border-[#2A2F3A] bg-[#121722] p-3">
                <div className="text-sm font-semibold text-white mb-2">Window Averages</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {marketSummary.windows.map((w) => (
                    <div key={w.window} className="rounded border border-[#2A2F3A] p-2">
                      <div className="text-muted-foreground uppercase">{w.window}</div>
                      <div className="text-white font-medium mt-1">
                        {w.averagePrice != null ? `$${w.averagePrice.toFixed(2)}` : '—'}
                      </div>
                      <div className="text-muted-foreground">{w.soldCount} sold</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-md border border-[#2A2F3A] bg-[#121722] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white">Price Over Time</div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border border-[#2A2F3A] bg-[#0B1018] p-0.5">
                    {(['7d', '30d'] as const).map((windowKey) => (
                      <button
                        key={windowKey}
                        type="button"
                        onClick={() => setChartWindow(windowKey)}
                        className={cn(
                          'rounded px-2 py-1 text-[11px] font-medium transition-colors',
                          chartWindow === windowKey
                            ? 'bg-[#7AFF14] text-black'
                            : 'text-muted-foreground hover:text-white'
                        )}
                      >
                        {windowKey.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {isAdminUser && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs border-[#7AFF14]/40 text-[#7AFF14] hover:bg-[#7AFF14]/10"
                      disabled={syncingMarketData}
                      onClick={() => {
                        void handleManualMarketSync();
                      }}
                    >
                      {syncingMarketData ? 'Fetching...' : 'Fetch Sold Data Now'}
                    </Button>
                  )}
                </div>
              </div>
              {marketHistoryQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading history...</div>
              ) : chartData ? (
                <div className="relative">
                  <svg
                    viewBox={`0 0 ${PRICE_CHART_WIDTH} ${PRICE_CHART_HEIGHT}`}
                    className="w-full h-48 rounded bg-[#0B1018] border border-[#1F2531]"
                    onMouseLeave={() => setActiveChartPointId(null)}
                  >
                    <line
                      x1={PRICE_CHART_PADDING.left}
                      y1={PRICE_CHART_PADDING.top}
                      x2={PRICE_CHART_WIDTH - PRICE_CHART_PADDING.right}
                      y2={PRICE_CHART_PADDING.top}
                      stroke="#2A2F3A"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={PRICE_CHART_PADDING.left}
                      y1={(PRICE_CHART_HEIGHT - PRICE_CHART_PADDING.bottom + PRICE_CHART_PADDING.top) / 2}
                      x2={PRICE_CHART_WIDTH - PRICE_CHART_PADDING.right}
                      y2={(PRICE_CHART_HEIGHT - PRICE_CHART_PADDING.bottom + PRICE_CHART_PADDING.top) / 2}
                      stroke="#2A2F3A"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={PRICE_CHART_PADDING.left}
                      y1={PRICE_CHART_HEIGHT - PRICE_CHART_PADDING.bottom}
                      x2={PRICE_CHART_WIDTH - PRICE_CHART_PADDING.right}
                      y2={PRICE_CHART_HEIGHT - PRICE_CHART_PADDING.bottom}
                      stroke="#2A2F3A"
                      strokeDasharray="3 3"
                    />

                    <text x="6" y={PRICE_CHART_PADDING.top + 4} fill="#9CA3AF" fontSize="11">
                      {formatChartPrice(chartData.maxY)}
                    </text>
                    <text
                      x="6"
                      y={(PRICE_CHART_HEIGHT - PRICE_CHART_PADDING.bottom + PRICE_CHART_PADDING.top) / 2 + 4}
                      fill="#9CA3AF"
                      fontSize="11"
                    >
                      {formatChartPrice(chartData.medianY)}
                    </text>
                    <text
                      x="6"
                      y={PRICE_CHART_HEIGHT - PRICE_CHART_PADDING.bottom + 4}
                      fill="#9CA3AF"
                      fontSize="11"
                    >
                      {formatChartPrice(chartData.minY)}
                    </text>

                    <polyline
                      fill="none"
                      stroke="#7AFF14"
                      strokeWidth="2.5"
                      points={chartData.polyline}
                    />

                    {chartData.points.map((point) => (
                      <g key={`chart-point-${point.id}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="10"
                          fill="transparent"
                          onMouseEnter={() => setActiveChartPointId(point.id)}
                          onClick={() => setActiveChartPointId(point.id)}
                        />
                      </g>
                    ))}

                    <circle
                      cx={chartData.latestPoint.x}
                      cy={chartData.latestPoint.y}
                      r="4.5"
                      fill="#7AFF14"
                      stroke="#0B1018"
                      strokeWidth="2"
                    />

                    <text
                      x={PRICE_CHART_PADDING.left}
                      y={PRICE_CHART_HEIGHT - 6}
                      fill="#9CA3AF"
                      fontSize="11"
                    >
                      {chartData.oldestLabel}
                    </text>
                    <text
                      x={PRICE_CHART_WIDTH - PRICE_CHART_PADDING.right}
                      y={PRICE_CHART_HEIGHT - 6}
                      fill="#9CA3AF"
                      fontSize="11"
                      textAnchor="end"
                    >
                      {chartData.newestLabel}
                    </text>
                  </svg>

                  <div
                    className="pointer-events-none absolute rounded-md border border-[#7AFF14]/50 bg-black/85 px-2 py-1 text-[11px] text-white"
                    style={{
                      left: `${Math.min(94, Math.max(8, (chartData.latestPoint.x / PRICE_CHART_WIDTH) * 100))}%`,
                      top: `${Math.min(80, Math.max(8, (chartData.latestPoint.y / PRICE_CHART_HEIGHT) * 100 - 14))}%`,
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    Latest {formatChartPrice(chartData.latestPoint.row.salePrice)}
                  </div>

                  {activeChartPoint && (
                    <div
                      className="absolute z-20 min-w-[210px] rounded-md border border-[#2A2F3A] bg-[#0B1018] p-2 text-[11px] text-white shadow-lg"
                      style={{
                        left: `${Math.min(92, Math.max(10, (activeChartPoint.x / PRICE_CHART_WIDTH) * 100))}%`,
                        top: `${Math.min(84, Math.max(10, (activeChartPoint.y / PRICE_CHART_HEIGHT) * 100 - 10))}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="font-semibold text-[#7AFF14]">
                        {formatChartPrice(activeChartPoint.row.salePrice)}
                      </div>
                      <div className="text-muted-foreground">
                        {activeChartPoint.row.dateSold
                          ? new Date(activeChartPoint.row.dateSold).toLocaleDateString()
                          : 'Date unavailable'}
                        {activeChartPoint.row.itemCondition
                          ? ` • ${activeChartPoint.row.itemCondition}`
                          : ''}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                        {activeChartPoint.row.soldTitle}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No sold listings to chart yet.</div>
              )}
            </div>

            <div className="rounded-md border border-[#2A2F3A] bg-[#121722] p-3">
              <div className="text-sm font-semibold text-white mb-2">Sold Listings History</div>
              {marketHistoryQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading sold listings...</div>
              ) : marketHistoryQuery.data?.listings?.length ? (
                <div className="space-y-2">
                  {marketHistoryQuery.data.listings.slice(0, 40).map((row) => (
                    <div key={row.id} className="rounded border border-[#2A2F3A] p-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {row.imageUrl ? (
                            <button
                              type="button"
                              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded border border-[#2A2F3A] bg-[#0B1018]"
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
                            <div className="h-14 w-14 shrink-0 rounded border border-[#2A2F3A] bg-[#0B1018]" />
                          )}
                          <div className="min-w-0">
                          <div className="text-sm text-white line-clamp-2">{row.soldTitle}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ${row.salePrice.toFixed(2)}
                            {row.dateSold
                              ? ` • ${new Date(row.dateSold).toLocaleDateString()}`
                              : ''}
                            {row.itemCondition ? ` • ${row.itemCondition}` : ''}
                          </div>
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {row.listingUrl ? (
                            <a
                              href={row.listingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#7AFF14] hover:underline"
                            >
                              View
                            </a>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-orange-400/40 text-orange-300 hover:bg-orange-500/10"
                            disabled={reportingListingId === row.id}
                            onClick={() => handleOpenReportDialog(row)}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {reportingListingId === row.id ? 'Reporting...' : 'Report'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No sold listings found.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sold Listing Image Modal */}
      <Dialog open={!!soldListingPreview} onOpenChange={() => setSoldListingPreview(null)}>
        <DialogTitle className="sr-only">Sold Listing Image Preview</DialogTitle>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent flex items-center justify-center"
          aria-describedby={undefined}
        >
          {soldListingPreview && (
            <img
              src={soldListingPreview.activeUrl}
              alt={soldListingPreview.soldTitle}
              className="block max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain rounded-lg"
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
          )}
        </DialogContent>
      </Dialog>

      {/* Report Listing Modal */}
      <Dialog open={!!reportDialogTarget} onOpenChange={(open) => !open && closeReportDialog()}>
        <DialogTitle className="sr-only">Report Sold Listing</DialogTitle>
        <DialogContent className="max-w-lg bg-[#0D0D0D] border-[#1E242E] text-white">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Report Sold Listing</h3>
              <p className="text-xs text-muted-foreground mt-1">
                This listing will be hidden from your view while admin reviews your report.
              </p>
            </div>

            {reportDialogTarget ? (
              <div className="rounded-md border border-[#2A2F3A] bg-[#121722] p-3">
                <div className="flex items-start gap-3">
                  {reportDialogTarget.imageUrl ? (
                    <img
                      src={reportDialogTarget.imageUrl}
                      alt={reportDialogTarget.soldTitle}
                      className="h-12 w-12 rounded border border-[#2A2F3A] object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded border border-[#2A2F3A] bg-[#0B1018]" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium line-clamp-2">{reportDialogTarget.soldTitle}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ${reportDialogTarget.salePrice.toFixed(2)}
                      {reportDialogTarget.dateSold
                        ? ` • ${new Date(reportDialogTarget.dateSold).toLocaleDateString()}`
                        : ''}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Reason</Label>
              <RadioGroup
                value={selectedReportReason}
                onValueChange={setSelectedReportReason}
                className="space-y-2"
              >
                {REPORT_REASON_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-md border border-[#2A2F3A] bg-[#121722] px-3 py-2 text-sm cursor-pointer"
                  >
                    <RadioGroupItem value={option.value} id={`report-reason-${option.value}`} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-reason-details" className="text-sm font-medium">
                Additional Details (optional)
              </Label>
              <Textarea
                id="report-reason-details"
                value={reportReasonDetails}
                onChange={(event) => setReportReasonDetails(event.target.value)}
                placeholder="Add context for admins (max 500 characters)"
                maxLength={500}
                className="min-h-[88px] bg-[#121722] border-[#2A2F3A]"
              />
              <div className="text-[11px] text-muted-foreground text-right">
                {reportReasonDetails.length}/500
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#2A2F3A]"
                onClick={closeReportDialog}
                disabled={!!reportingListingId}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-orange-500 text-white hover:bg-orange-500/90"
                onClick={() => {
                  void handleSubmitReport();
                }}
                disabled={!selectedReportReason || !!reportingListingId}
              >
                {reportingListingId ? 'Reporting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
