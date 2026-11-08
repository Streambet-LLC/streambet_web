import { Link } from 'react-router-dom';
import { Clock, Star, Video } from 'lucide-react';
import type { PublicAuction } from '@/integrations/api/hermes';
import {
  CATEGORY_LABEL,
  DEFAULT_EXTENSION_WINDOW_SECONDS,
  fmtExtensionWindow,
  fmtRemaining,
  fmtUsd,
} from './format';
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

/** Live bid-panel hint once the clock is inside the soft-close window. */
export function SoftCloseHint({ auction }: { auction: PublicAuction }) {
  const ms = useCountdown(auction.endsAt);
  const windowS = auction.extensionWindowSeconds ?? DEFAULT_EXTENSION_WINDOW_SECONDS;
  if (auction.bucket !== 'live' || ms <= 0 || ms > windowS * 1000) return null;
  return (
    <p className="mt-1 text-xs font-semibold text-[#C7FA09]">
      Any bid now resets the clock to {fmtExtensionWindow(windowS)}
    </p>
  );
}

/** Grid / rail card for a live, upcoming or ended auction. */
export function AuctionCard({ auction }: { auction: PublicAuction }) {
  const cover = auction.images[0]?.url;
  const live = auction.bucket === 'live';
  const ended = auction.bucket === 'settled';
  const sold = ended && !!auction.result?.sold;
  const badge = live
    ? { label: 'Live', cls: 'bg-[#C7FA09] text-black' }
    : ended
      ? sold
        ? { label: 'Sold', cls: 'bg-white text-black' }
        : { label: 'Ended', cls: 'bg-white/20 text-white' }
      : { label: 'Upcoming', cls: 'bg-sky-400/90 text-black' };
  const priceLabel = sold
    ? 'Sold for'
    : ended
      ? auction.currentBidUsd != null
        ? 'High bid'
        : 'Starting bid'
      : auction.currentBidUsd != null
        ? 'Current bid'
        : 'Starting bid';
  const price = sold
    ? (auction.result?.winningBidUsd ?? auction.currentBidUsd)
    : (auction.currentBidUsd ?? auction.startingPriceUsd);
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
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${badge.cls}`}
          >
            {badge.label}
          </span>
          {auction.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-[#C7FA09]">
              <Star className="h-3 w-3 fill-current" /> Featured
            </span>
          )}
        </div>
        {auction.videos.some(v => v.spin) ? (
          <span
            className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-extrabold leading-none text-[#C7FA09]"
            title="Has a 360° spin"
          >
            360°
          </span>
        ) : (
          auction.videos.length > 0 && (
            <span
              className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"
              title="Has video"
            >
              <Video className="h-3.5 w-3.5" />
            </span>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/45">
          {CATEGORY_LABEL[auction.category]}
          <span className="normal-case tracking-normal text-white/40">
            {' '}
            · by {auction.sellerName}
          </span>
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
          {auction.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-[11px] text-white/45">{priceLabel}</p>
            <p className="text-lg font-extrabold text-white">{fmtUsd(price)}</p>
          </div>
          <div className="text-right text-xs">
            <AuctionClock auction={auction} compact />
            <p className="mt-0.5 text-white/45">
              {auction.bidCount} bid{auction.bidCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!ended && <ReserveBadge auction={auction} />}
          <PaymentsBadge accepted={auction.acceptedPayments} />
          {auction.estValueUsd != null && (
            <span className="text-[11px] text-white/55">Est. {fmtUsd(auction.estValueUsd)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
