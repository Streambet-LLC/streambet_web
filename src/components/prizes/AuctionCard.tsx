import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Gavel, Clock, TrendingUp, ShieldCheck, ShieldAlert, Eye, Heart, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getThumbnailUrl } from '@/utils/helper';
import { cn } from '@/lib/utils';
import FeaturedBetCard from '../FeaturedBetCard';
import WatchButton from './WatchButton';
import AuctionBidModal from './AuctionBidModal';
import useAuctionSocket from '@/hooks/useAuctionSocket';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
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
export default function AuctionCard({ prize, isFeatured = false }: AuctionCardProps) {
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

  // Self-bid guard: sellers can't bid on their own item. Mirrors PrizeCard's
  // owner detection — backend also enforces in placeBid().
  const { session } = useAuthContext();
  const sessionUserId = session?.user?.id || (session as { id?: string } | null)?.id || null;
  const sessionUsername = (session?.user?.username || (session as { username?: string } | null)?.username || '')
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

  useAuctionSocket({ auctionId: auction.id });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const endsAtMs = new Date(auction.endsAt).getTime();
  const msLeft = endsAtMs - now;
  const isEnded = msLeft <= 0 || ['ended', 'paid', 'unsold', 'failed', 'cancelled'].includes(auction.status);
  const isUrgent = !isEnded && msLeft <= 60 * 60 * 1000; // <1h

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
  const safeIndex = galleryUrls.length
    ? ((activeImageIndex % galleryUrls.length) + galleryUrls.length) % galleryUrls.length
    : 0;
  const activeImageUrl = galleryUrls[safeIndex];
  const goToPreviousImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex(i => (i - 1 + galleryUrls.length) % galleryUrls.length);
  };
  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex(i => (i + 1) % galleryUrls.length);
  };

  const card = (
    <Card
      className={cn(
        'flex flex-col overflow-hidden transition-colors',
        isFeatured ? 'bg-transparent border-0 shadow-none' : 'bg-card border border-border hover:border-primary'
      )}
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {activeImageUrl ? (
          <img src={activeImageUrl} alt={prize.name} className="w-full h-full object-cover" />
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
              className="absolute left-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 border border-[#7AFF14] md:inline-flex"
              onClick={goToPreviousImage}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 border border-[#7AFF14] md:inline-flex"
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
        <div className="absolute bottom-2 right-2">
          <WatchButton itemId={prize.id} initialIsWatching={prize.isWatching ?? false} initialWatcherCount={prize.watcherCount ?? 0} overlay />
        </div>
      </div>

      <CardContent className="flex flex-col gap-2 p-4">
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

        {(prize.viewCount || prize.watcherCount) ? (
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
          </div>
        ) : null}
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
        ) : (
          <Button
            className="w-full"
            disabled={isEnded || auction.status === 'cancelled'}
            onClick={() => setIsBidOpen(true)}
          >
            <Gavel className="w-4 h-4 mr-2" />
            {isEnded
              ? 'Ended'
              : auction.isLeader
                ? 'Raise your max'
                : 'Place a bid'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <>
      {isFeatured ? <FeaturedBetCard>{card}</FeaturedBetCard> : card}
      <AuctionBidModal
        isOpen={isBidOpen}
        onClose={() => setIsBidOpen(false)}
        prize={{ id: prize.id, name: prize.name, imageUrl: prize.imageUrl }}
        auction={auction}
      />
    </>
  );
}
