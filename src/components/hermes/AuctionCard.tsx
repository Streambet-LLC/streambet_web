import { Link } from 'react-router-dom';
import { Clock, Star, Video } from 'lucide-react';
import type { PublicAuction } from '@/integrations/api/hermes';
import { CATEGORY_LABEL, fmtRemaining, fmtUsd } from './format';
import { useCountdown } from './useCountdown';

export function ReserveBadge({
  auction,
}: {
  auction: Pick<PublicAuction, 'hasReserve' | 'reserveMet'>;
}) {
  if (!auction.hasReserve) {
    return (
      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/70">
        No reserve
      </span>
    );
  }
  return auction.reserveMet ? (
    <span className="rounded-full bg-[#C7FA09]/15 px-2 py-0.5 text-[11px] font-semibold text-[#C7FA09]">
      Reserve met
    </span>
  ) : (
    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
      Reserve not met
    </span>
  );
}

/** Shown when an auction takes only one rail ("both" needs no badge). */
export function PaymentsBadge({ accepted }: { accepted: PublicAuction['acceptedPayments'] }) {
  if (accepted === 'both') return null;
  return (
    <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
      {accepted === 'crypto' ? 'USDC only' : 'Card & bank only'}
    </span>
  );
}

export function AuctionClock({ auction, compact }: { auction: PublicAuction; compact?: boolean }) {
  const upcoming = auction.bucket === 'upcoming';
  const ms = useCountdown(upcoming ? auction.startsAt : auction.endsAt);
  if (auction.bucket === 'settled') {
    return <span className="text-white/60">Ended</span>;
  }
  const urgent = !upcoming && ms < 60 * 60 * 1000;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
        urgent ? 'text-red-400' : upcoming ? 'text-sky-300' : 'text-white'
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      {upcoming ? (compact ? 'Starts ' : 'Starts in ') : ''}
      {fmtRemaining(ms)}
    </span>
  );
}

/** Grid / rail card for a live or upcoming auction. */
export function AuctionCard({ auction }: { auction: PublicAuction }) {
  const cover = auction.images[0]?.url;
  const live = auction.bucket === 'live';
  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414] transition hover:-translate-y-0.5 hover:border-[#C7FA09]/50 hover:shadow-[0_0_24px_rgba(199,250,9,0.12)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-black">
        {cover ? (
          <img
            src={cover}
            alt={auction.title}
            loading="lazy"
            className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/30">No photo</div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
              live ? 'bg-[#C7FA09] text-black' : 'bg-sky-400/90 text-black'
            }`}
          >
            {live ? 'Live' : 'Upcoming'}
          </span>
          {auction.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-[#C7FA09]">
              <Star className="h-3 w-3 fill-current" /> Featured
            </span>
          )}
        </div>
        {auction.videos.length > 0 && (
          <span
            className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"
            title="Has video"
          >
            <Video className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
          {CATEGORY_LABEL[auction.category]}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
          {auction.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-[11px] text-white/45">
              {auction.currentBidUsd != null ? 'Current bid' : 'Starting bid'}
            </p>
            <p className="text-lg font-extrabold text-white">
              {fmtUsd(auction.currentBidUsd ?? auction.startingPriceUsd)}
            </p>
          </div>
          <div className="text-right text-xs">
            <AuctionClock auction={auction} compact />
            <p className="mt-0.5 text-white/45">
              {auction.bidCount} bid{auction.bidCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ReserveBadge auction={auction} />
          <PaymentsBadge accepted={auction.acceptedPayments} />
          {auction.estValueUsd != null && (
            <span className="text-[11px] text-white/55">Est. {fmtUsd(auction.estValueUsd)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
