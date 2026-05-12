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
  AlertTriangle,
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
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

const formatChartPrice = (price: number): string => `$${price.toFixed(0)}`;
const formatShortDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const [chartWindow, setChartWindow] = useState<'7d' | '30d' | 'all'>('30d');
  const [activeChartPointId, setActiveChartPointId] = useState<string | null>(null);
  const [highlightedListingId, setHighlightedListingId] = useState<string | null>(null);
  const [listingsSortBy, setListingsSortBy] = useState<'date' | 'price-high' | 'price-low'>('date');
  const [displayedListingsCount, setDisplayedListingsCount] = useState(20);
  const [soldListingPreview, setSoldListingPreview] = useState<{
    activeUrl: string;
    thumbnailUrl: string;
    fullResolutionUrl: string;
    soldTitle: string;
  } | null>(null);
  const [reportDialogTarget, setReportDialogTarget] = useState<{
    listingId: string;
    soldTitle: string;
    imageUrl: string | null;
    salePrice: number;
    dateSold: string | null;
  } | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<string>('');
  const [reportReasonDetails, setReportReasonDetails] = useState('');
  const [reportingListingId, setReportingListingId] = useState<string | null>(null);

  const soldListingsHistoryRef = useRef<HTMLDivElement>(null);
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

  // Determine if actual eBay data should be displayed (vs "Coming Soon")
  const canShowEbayData = isAdminUser
    ? true
    : (prize.showEbayAvgPublicly ?? false);

  // eBay market data
  const marketSummaryQuery = useQuery({
    queryKey: ['ebay-market-summary', prize.id],
    queryFn: () => prizeAPI.getEbayMarketSummary(prize.id),
    enabled: shouldShowEbayBox || showMarketModal,
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

    let rows = allRows;
    
    if (chartWindow !== 'all') {
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

      rows = filteredRows.length ? filteredRows : allRows;
    }
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

  const sortedListings = useMemo(() => {
    const listings = marketHistoryQuery.data?.listings ?? [];
    const sorted = [...listings];
    
    if (listingsSortBy === 'date') {
      sorted.sort((a, b) => {
        const dateA = a.dateSold ? new Date(a.dateSold).getTime() : 0;
        const dateB = b.dateSold ? new Date(b.dateSold).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    } else if (listingsSortBy === 'price-high') {
      sorted.sort((a, b) => b.salePrice - a.salePrice);
    } else if (listingsSortBy === 'price-low') {
      sorted.sort((a, b) => a.salePrice - b.salePrice);
    }
    
    return sorted;
  }, [marketHistoryQuery.data?.listings, listingsSortBy]);

  const handleBidClick = () => {
    if (!session) {
      const redirect = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    setIsBidOpen(true);
  };

  useEffect(() => {
    setActiveChartPointId(null);
    setDisplayedListingsCount(20); // Reset display count when data changes
  }, [chartWindow, marketHistoryQuery.data?.listings]);

  const handleChartPointClick = (pointId: string) => {
    setHighlightedListingId(pointId);
    
    // Check if the clicked listing is beyond the current display count
    const listingIndex = sortedListings.findIndex(listing => listing.id === pointId);
    if (listingIndex !== -1 && listingIndex >= displayedListingsCount) {
      // Auto-expand to include the clicked listing
      setDisplayedListingsCount(listingIndex + 1);
    }
    
    // Scroll to the sold listings history section
    setTimeout(() => {
      soldListingsHistoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Find the specific listing element and scroll it into view
      const listingElement = document.getElementById(`sold-listing-${pointId}`);
      if (listingElement) {
        setTimeout(() => {
          listingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }, 100);
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedListingId(null);
    }, 3000);
  };

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
          <h3 className="font-semibold text-base leading-tight line-clamp-2">{prize.name}</h3>
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
            className="w-full rounded-md border border-[#2A2F3A] bg-[#11151d] px-3 py-2 text-left transition-colors hover:border-[#7AFF14]/50 mt-2"
            onClick={e => {
              e.stopPropagation();
              if (canShowEbayData) {
                setShowMarketModal(true);
              }
            }}
          >
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">eBay sold avg (latest 10)</div>
            {marketSummaryQuery.isLoading ? (
              <div className="mt-1 text-xs text-muted-foreground">Loading market data...</div>
            ) : canShowEbayData && latestAvg !== null ? (
              <div className="mt-1">
                <span className="text-sm font-semibold text-[#7AFF14]">${latestAvg.toFixed(2)}</span>
              </div>
            ) : (
              <div className="mt-1 text-sm font-medium text-muted-foreground">Coming Soon</div>
            )}
            <div className="mt-1 text-[10px] text-muted-foreground">
              {canShowEbayData && latestAvg !== null && cardLastCalculated
                ? `Updated ${new Date(cardLastCalculated).toLocaleString()}`
                : ''}
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
      {shouldShowEbayBox && ebayManualSyncEnabled && (
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
                  <div className="text-[11px] text-muted-foreground uppercase">Diff vs Current Bid</div>
                  <div
                    className={cn(
                      'mt-1 text-sm font-semibold leading-snug',
                      marketSummary?.averagePrice == null
                        ? 'text-muted-foreground'
                        : (auction.currentBidUsd ?? auction.startingPriceUsd) >= marketSummary.averagePrice
                          ? 'text-orange-400'
                          : 'text-emerald-400'
                    )}
                  >
                    {marketSummary?.averagePrice == null
                      ? '—'
                      : `Bid $${Math.abs((auction.currentBidUsd ?? auction.startingPriceUsd) - marketSummary.averagePrice).toFixed(2)} ${(auction.currentBidUsd ?? auction.startingPriceUsd) >= marketSummary.averagePrice ? 'above' : 'below'} eBay market`}
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
                        <div className="text-[#7AFF14] font-medium mt-1">
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
                      {(['7d', '30d', 'all'] as const).map((windowKey) => (
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
                    {isAdminUser && ebayManualSyncEnabled && (
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
                          {/* Visible dot */}
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="#7AFF14"
                            className="transition-all duration-200"
                          />
                          {/* Larger invisible hit area for better interaction */}
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="10"
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setActiveChartPointId(point.id)}
                            onMouseLeave={() => setActiveChartPointId(null)}
                            onClick={() => handleChartPointClick(point.id)}
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

                    {activeChartPoint && (() => {
                      const xPercent = (activeChartPoint.x / PRICE_CHART_WIDTH) * 100;
                      const yPercent = (activeChartPoint.y / PRICE_CHART_HEIGHT) * 100;
                      
                      // Determine positioning based on location in chart
                      let leftPos = xPercent;
                      let topPos = yPercent;
                      let transformX = '-50%'; // default: center horizontally
                      let transformY = '-100%'; // default: position above point
                      
                      // Adjust horizontal positioning to keep within bounds
                      if (xPercent < 25) {
                        // Near left edge - align left of tooltip with point
                        leftPos = xPercent;
                        transformX = '0%';
                      } else if (xPercent > 75) {
                        // Near right edge - align right of tooltip with point
                        leftPos = xPercent;
                        transformX = '-100%';
                      }
                      
                      // Adjust vertical positioning to keep within bounds
                      if (yPercent < 30) {
                        // Near top edge - position below point instead
                        topPos = yPercent;
                        transformY = '10%';
                      }
                      
                      return (
                        <div
                          className="absolute z-20 min-w-[210px] max-w-[250px] rounded-md border border-[#2A2F3A] bg-[#0B1018] p-2 text-[11px] text-white shadow-lg"
                          style={{
                            left: `${leftPos}%`,
                            top: `${topPos}%`,
                            transform: `translate(${transformX}, ${transformY})`,
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
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No sold listings to chart yet.</div>
                )}
              </div>

              <div className="rounded-md border border-[#2A2F3A] bg-[#121722] p-3" ref={soldListingsHistoryRef}>
                <div className="text-sm font-semibold text-white mb-2 flex items-center justify-between">
                  <span>Sold Listings History</span>
                  <div className="inline-flex rounded-md border border-[#2A2F3A] bg-[#0B1018] p-0.5">
                    <button
                      type="button"
                      onClick={() => setListingsSortBy('date')}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        listingsSortBy === 'date' ? 'bg-[#7AFF14] text-black' : 'text-muted-foreground hover:text-white'
                      }`}
                    >
                      Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setListingsSortBy('price-high')}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        listingsSortBy === 'price-high' ? 'bg-[#7AFF14] text-black' : 'text-muted-foreground hover:text-white'
                      }`}
                    >
                      $ High
                    </button>
                    <button
                      type="button"
                      onClick={() => setListingsSortBy('price-low')}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        listingsSortBy === 'price-low' ? 'bg-[#7AFF14] text-black' : 'text-muted-foreground hover:text-white'
                      }`}
                    >
                      $ Low
                    </button>
                  </div>
                </div>
                {marketHistoryQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading sold listings...</div>
                ) : sortedListings.length ? (
                  <>
                    <div className="space-y-2">
                      {sortedListings.slice(0, displayedListingsCount).map((row) => (
                      <div 
                        key={row.id} 
                        id={`sold-listing-${row.id}`}
                        className={cn(
                          "rounded border p-2 transition-all duration-300",
                          highlightedListingId === row.id
                            ? "border-[#7AFF14] bg-[#7AFF14]/10 shadow-lg shadow-[#7AFF14]/20"
                            : "border-[#2A2F3A]"
                        )}
                      >
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
                              <span className="text-[#7AFF14] font-semibold">${row.salePrice.toFixed(2)}</span>
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs border-orange-400/40 text-orange-300 hover:bg-orange-500/10"
                                    disabled={reportingListingId === row.id}
                                    onClick={() => handleOpenReportDialog(row)}
                                  >
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {reportingListingId === row.id ? 'Removing...' : 'Remove'}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">This listing will be removed from your results and averages will be recalculated</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                    
                    {displayedListingsCount < sortedListings.length && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-[#2A2F3A] bg-[#0B1018] hover:bg-[#1A1F2E] text-white"
                          onClick={() => setDisplayedListingsCount(prev => Math.min(prev + 20, sortedListings.length))}
                        >
                          Show More ({Math.min(20, sortedListings.length - displayedListingsCount)} more)
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-white"
                          onClick={() => setDisplayedListingsCount(sortedListings.length)}
                        >
                          Show All ({sortedListings.length})
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No sold listings found.</div>
                )}
              </div>
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
              <Label htmlFor="report-details" className="text-sm font-medium">
                Additional Details (optional)
              </Label>
              <Textarea
                id="report-details"
                placeholder="Please provide any additional context..."
                className="min-h-[80px] bg-[#121722] border-[#2A2F3A] text-white"
                value={reportReasonDetails}
                onChange={(e) => setReportReasonDetails(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={closeReportDialog}
                className="text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSubmitReport}
                disabled={!selectedReportReason || reportingListingId !== null}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {reportingListingId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen image lightbox — mirrors PrizeCard's behavior. The
          DialogContent uses `pointer-events-none` so taps outside the image
          fall through to nothing, which on mobile previously left users
          stuck (no close X, no swipe handler). We now mirror PrizeCard:
          - Always-visible close button (also on mobile).
          - framer-motion drag-to-dismiss (swipe down to close).
          - Visible "Swipe down to close" hint on small screens. */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogTitle className="sr-only">Auction Image</DialogTitle>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-4 border-0 bg-transparent flex items-center justify-center pointer-events-none"
          aria-describedby={undefined}
          hideCloseButton
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
            onDragEnd={(_e, info) => {
              if (info.offset.y > 100) setIsLightboxOpen(false);
            }}
          >
            {/* Mobile-only swipe affordance. */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 md:hidden">
              <div className="w-12 h-1 bg-white rounded-full" />
              <span className="text-xs text-white">Swipe down to close</span>
            </div>

            {/* Close button — visible on every breakpoint so mobile users
                always have an explicit dismiss control. */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-3 -right-3 z-50 rounded-full border border-[#7AFF14] bg-black/80 p-2 transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-white"
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
                  className="inline-flex h-9 w-9 shrink-0 border border-[#7AFF14] md:h-10 md:w-10"
                  onClick={() => goToPreviousImage()}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <img
                src={activeImageUrl}
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
                  className="inline-flex h-9 w-9 shrink-0 border border-[#7AFF14] md:h-10 md:w-10"
                  onClick={() => goToNextImage()}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>

            {hasMultipleImages && (
              <div className="absolute -bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1">
                {galleryUrls.map((_, index) => (
                  <button
                    key={`${prize.id}-lightbox-dot-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={cn(
                      'h-2 w-2 rounded-full border border-[#7AFF14] transition-all',
                      index === safeIndex ? 'bg-white' : 'bg-transparent'
                    )}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
