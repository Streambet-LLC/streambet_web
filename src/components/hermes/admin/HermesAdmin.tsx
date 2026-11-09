import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Plus, RefreshCw, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  hermesAdminAPI,
  type AdminAuctionDetail,
  type AdminAuctionRow,
  type AuctionBucket,
} from '@/integrations/api/hermes';
import { CATEGORY_LABEL, METHOD_LABEL, fmtEstValue, fmtRemaining, fmtUsd } from '../format';
import { Pill, ReserveCell, Segmented, StatusBadge } from './adminUi';
import { AdminAuctionDetailDialog } from './AdminAuctionDetailDialog';
import { AuctionFormDialog } from './AuctionFormDialog';
import {
  GHOST_BUTTON_CLASS,
  HOUR_MS,
  LIME_BUTTON_CLASS,
  adminKeys,
  errorMessage,
  fmtShortDateTime,
  useNow,
} from './adminUtils';

type AdminAuction = AdminAuctionDetail['auction'];

const BUCKETS: ReadonlyArray<{ value: AuctionBucket; label: string }> = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'settled', label: 'Settled' },
];

const EMPTY_COPY: Record<AuctionBucket, { title: string; body: string }> = {
  live: { title: 'No live auctions yet', body: 'Start one now, or schedule it for later.' },
  upcoming: {
    title: 'No upcoming auctions',
    body: 'Scheduled auctions show up here until they open.',
  },
  settled: {
    title: 'No settled auctions yet',
    body: 'Sold, unsold and cancelled auctions land here.',
  },
};

const FULFILLMENT_SHORT: Record<AdminAuctionRow['fulfillmentStatus'], string> = {
  pending: 'Not shipped',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

/**
 * Admin home for Hermes Auctions: review live / upcoming / settled auctions,
 * create and edit them, and drill into one for bids, escrows, payment and
 * fulfillment. `selectedAuctionId` / `onSelectAuction` let the page keep the
 * open auction in the URL (`?tab=auctions&auction=<id>`).
 */
export function HermesAdmin({
  selectedAuctionId,
  onSelectAuction,
}: {
  selectedAuctionId?: string | null;
  onSelectAuction?: (id: string | null) => void;
}) {
  const [bucket, setBucket] = useState<AuctionBucket>('live');
  const [localId, setLocalId] = useState<string | null>(null);
  const controlled = onSelectAuction !== undefined;
  const openId = controlled ? (selectedAuctionId ?? null) : localId;
  const select = useCallback(
    (id: string | null) => (onSelectAuction ? onSelectAuction(id) : setLocalId(id)),
    [onSelectAuction]
  );

  const [form, setForm] = useState<{ open: boolean; auction: AdminAuction | null }>({
    open: false,
    auction: null,
  });
  const openCreate = () => setForm({ open: true, auction: null });

  // Deep link (e.g. the "sold" email): show the auction's own bucket behind it.
  const [deepLinkId] = useState(() => selectedAuctionId ?? null);
  const [deepLinkDone, setDeepLinkDone] = useState(false);
  const deepLink = useQuery({
    queryKey: adminKeys.detail(deepLinkId ?? ''),
    queryFn: () => hermesAdminAPI.get(deepLinkId!),
    enabled: !!deepLinkId && !deepLinkDone,
    retry: false,
  });
  useEffect(() => {
    if (deepLinkDone || !deepLink.data) return;
    setBucket(deepLink.data.auction.bucket);
    setDeepLinkDone(true);
  }, [deepLink.data, deepLinkDone]);

  const list = useQuery({
    queryKey: adminKeys.list(bucket),
    queryFn: () => hermesAdminAPI.list(bucket),
    refetchInterval: 15_000,
  });
  const rows = list.data ?? [];
  const now = useNow(bucket === 'settled' ? 0 : 1000);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center">
            <img
              src="/hermes/hermes-auctions-logo.png"
              alt="Hermes Auctions"
              className="h-9 w-auto sm:h-10"
            />
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Run house auctions — create and schedule lots, watch bidding live, then settle, ship and
            audit what sold. Winners pay a buyer fee on the hammer that depends on how they pay
            (card, ACH or USDC), fixed per lot when it's listed.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          className={cn(LIME_BUTTON_CLASS, 'h-10 shrink-0 shadow-[0_0_16px_rgba(199,250,9,0.25)]')}
        >
          <Plus /> New auction
        </Button>
      </div>

      <Card className="border-white/5 bg-[rgba(22,22,22,1)] p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Segmented
            ariaLabel="Auction status"
            value={bucket}
            onChange={v => setBucket(v)}
            options={BUCKETS}
          />
          <div className="flex items-center gap-2">
            {list.data && (
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-muted-foreground">
                {rows.length} auction{rows.length === 1 ? '' : 's'}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void list.refetch()}
              aria-label="Refresh"
              className={cn(GHOST_BUTTON_CLASS, 'h-8 w-8')}
            >
              <RefreshCw className={cn(list.isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {list.isPending ? (
          <ListSkeleton />
        ) : list.isError && !list.data ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-white/80">Couldn't load auctions.</p>
            <p className="text-xs text-muted-foreground">{errorMessage(list.error)}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={GHOST_BUTTON_CLASS}
              onClick={() => void list.refetch()}
            >
              <RefreshCw /> Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <img src="/hermes/hermes-mark-64.png" alt="" className="h-12 w-12 opacity-70" />
            <p className="mt-1 text-sm font-medium text-white">{EMPTY_COPY[bucket].title}</p>
            <p className="text-xs text-muted-foreground">{EMPTY_COPY[bucket].body}</p>
            {bucket !== 'settled' && (
              <Button
                type="button"
                size="sm"
                onClick={openCreate}
                className={cn(LIME_BUTTON_CLASS, 'mt-2')}
              >
                <Plus /> New auction
              </Button>
            )}
          </div>
        ) : (
          <>
            <AuctionTable rows={rows} bucket={bucket} now={now} onOpen={select} />
            <AuctionCards rows={rows} bucket={bucket} now={now} onOpen={select} />
          </>
        )}
      </Card>

      <AdminAuctionDetailDialog
        auctionId={openId}
        onClose={() => select(null)}
        onEdit={a => setForm({ open: true, auction: a })}
      />

      <AuctionFormDialog
        open={form.open}
        auction={form.auction}
        onOpenChange={o => setForm(f => ({ ...f, open: o }))}
        onSaved={(detail, created) => {
          setForm(f => ({ ...f, open: false }));
          if (created) {
            setBucket(detail.auction.bucket);
            select(detail.auction.id);
          }
        }}
      />
    </div>
  );
}

// ── Cells ────────────────────────────────────────────────────────────────

function Cover({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={cn('shrink-0 rounded-md border border-white/10 bg-black object-cover', className)}
    />
  ) : (
    <div className={cn('shrink-0 rounded-md border border-white/10 bg-white/5', className)} />
  );
}

function OverdueFlag() {
  return (
    <Pill
      className="border-amber-400/40 bg-amber-400/10 text-amber-300"
      title="Past its end time but not settled yet"
    >
      <AlertTriangle className="h-3 w-3" aria-hidden /> Overdue
    </Pill>
  );
}

function FeaturedStar() {
  return (
    <span title="Featured on the landing page" className="inline-flex">
      <Star className="h-3.5 w-3.5 fill-[#C7FA09] text-[#C7FA09]" aria-hidden />
      <span className="sr-only">Featured</span>
    </span>
  );
}

function TimeCell({ row, now }: { row: AdminAuctionRow; now: number }) {
  const ends = new Date(row.endsAt).getTime();
  const starts = new Date(row.startsAt).getTime();
  if (row.status === 'active') {
    const left = ends - now;
    return (
      <span className="block">
        <span
          className={cn(
            'block font-semibold tabular-nums',
            left <= 0 ? 'text-amber-300' : left < HOUR_MS ? 'text-red-300' : 'text-[#C7FA09]'
          )}
        >
          {left > 0 ? `${fmtRemaining(left)} left` : 'Closing…'}
        </span>
        <span className="block text-xs text-muted-foreground">
          ends {fmtShortDateTime(row.endsAt)}
        </span>
      </span>
    );
  }
  if (row.status === 'scheduled') {
    return (
      <span className="block">
        <span className="block text-white/85">starts {fmtShortDateTime(row.startsAt)}</span>
        <span className="block text-xs tabular-nums text-muted-foreground">
          {starts > now ? `in ${fmtRemaining(starts - now)}` : 'opening…'}
        </span>
      </span>
    );
  }
  return (
    <span className="block">
      <span className="block text-white/75">ended {fmtShortDateTime(row.endsAt)}</span>
    </span>
  );
}

function BidCell({ row }: { row: AdminAuctionRow }) {
  if (row.bucket === 'settled') {
    if (row.winningAmountUsd != null) {
      return (
        <span className="block">
          <span className="block font-semibold tabular-nums text-white">
            {fmtUsd(row.winningAmountUsd)}
          </span>
          {row.winner && (
            <span className="block truncate text-xs text-muted-foreground">{row.winner}</span>
          )}
        </span>
      );
    }
    return (
      <span className="block">
        <span className="block text-white/50">No sale</span>
        {row.currentBidUsd != null && (
          <span className="block text-xs tabular-nums text-muted-foreground">
            high {fmtUsd(row.currentBidUsd)}
          </span>
        )}
      </span>
    );
  }
  if (row.currentBidUsd != null) {
    return (
      <span className="block">
        <span className="block font-semibold tabular-nums text-white">
          {fmtUsd(row.currentBidUsd)}
        </span>
        {row.leader && (
          <span className="block truncate text-xs text-muted-foreground">{row.leader}</span>
        )}
      </span>
    );
  }
  return (
    <span className="block">
      <span className="block text-white/50">No bids</span>
      <span className="block text-xs tabular-nums text-muted-foreground">
        opens {fmtUsd(row.startingPriceUsd)}
      </span>
    </span>
  );
}

function SettledMeta({ row }: { row: AdminAuctionRow }) {
  if (row.status !== 'paid' && row.status !== 'ended' && row.status !== 'failed') return null;
  const parts = [
    row.paymentMethod ? METHOD_LABEL[row.paymentMethod] : null,
    row.status === 'paid' ? FULFILLMENT_SHORT[row.fulfillmentStatus] : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <span
      className={cn(
        'mt-1 block text-xs',
        row.status === 'paid' && row.fulfillmentStatus === 'pending'
          ? 'text-amber-300'
          : 'text-muted-foreground'
      )}
    >
      {parts.join(' · ')}
    </span>
  );
}

const highBidOf = (r: AdminAuctionRow) => r.winningAmountUsd ?? r.currentBidUsd;

// ── Desktop table ────────────────────────────────────────────────────────

function AuctionTable({
  rows,
  bucket,
  now,
  onOpen,
}: {
  rows: AdminAuctionRow[];
  bucket: AuctionBucket;
  now: number;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-2 py-2 font-medium">
              Item
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              {bucket === 'upcoming' ? 'Starts' : bucket === 'live' ? 'Time left' : 'Ended'}
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              {bucket === 'settled' ? 'Winning bid' : 'Current bid'}
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              Reserve
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Est. value
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Bids
            </th>
            <th scope="col" className="w-6 px-2 py-2">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr
              key={r.id}
              onClick={() => onOpen(r.id)}
              className="cursor-pointer border-b border-white/5 align-middle text-white/85 transition-colors last:border-0 hover:bg-white/[0.03]"
            >
              <td className="max-w-[360px] px-2 py-2.5">
                <div className="flex items-center gap-3">
                  <Cover src={r.image} className="h-12 w-12" />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onOpen(r.id);
                      }}
                      className="line-clamp-2 rounded-sm text-left font-medium text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]/60"
                    >
                      {r.title}
                    </button>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{CATEGORY_LABEL[r.category] ?? r.category}</span>
                      {r.isFeatured && <FeaturedStar />}
                      {r.isOverdue && <OverdueFlag />}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-2 py-2.5">
                <StatusBadge status={r.status} />
                <SettledMeta row={r} />
              </td>
              <td className="whitespace-nowrap px-2 py-2.5">
                <TimeCell row={r} now={now} />
              </td>
              <td className="max-w-[160px] whitespace-nowrap px-2 py-2.5">
                <BidCell row={r} />
              </td>
              <td className="whitespace-nowrap px-2 py-2.5">
                <ReserveCell reserveUsd={r.reservePriceUsd} bidUsd={highBidOf(r)} />
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-white/75">
                {fmtEstValue(r.estValueUsd, r.estValueHighUsd)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">{r.bidCount}</td>
              <td className="px-2 py-2.5 text-white/30">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile cards ─────────────────────────────────────────────────────────

function Kv({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs text-white/85">{children}</dd>
    </div>
  );
}

function AuctionCards({
  rows,
  bucket,
  now,
  onOpen,
}: {
  rows: AdminAuctionRow[];
  bucket: AuctionBucket;
  now: number;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="space-y-2 md:hidden">
      {rows.map(r => (
        <li
          key={r.id}
          className="relative flex gap-3 rounded-lg border border-white/5 bg-black/20 p-3 transition-colors focus-within:ring-2 focus-within:ring-[#C7FA09]/60 hover:bg-white/[0.03]"
        >
          <Cover src={r.image} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              {/* Stretched button: the whole card is the hit area, the title is its name. */}
              <button
                type="button"
                onClick={() => onOpen(r.id)}
                className="line-clamp-2 text-left text-sm font-medium leading-snug text-white after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
              >
                {r.title}
              </button>
              {r.isFeatured && <FeaturedStar />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={r.status} />
              {r.isOverdue && <OverdueFlag />}
              <span className="text-[11px] text-muted-foreground">
                {CATEGORY_LABEL[r.category] ?? r.category}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
              <Kv label={bucket === 'settled' ? 'Winning bid' : 'Current bid'}>
                <BidCell row={r} />
              </Kv>
              <Kv
                label={bucket === 'upcoming' ? 'Starts' : bucket === 'live' ? 'Time left' : 'Ended'}
              >
                <TimeCell row={r} now={now} />
              </Kv>
              <Kv label="Reserve">
                <ReserveCell reserveUsd={r.reservePriceUsd} bidUsd={highBidOf(r)} compact />
              </Kv>
              <Kv label="Est. value · Bids">
                <span className="tabular-nums">
                  {fmtEstValue(r.estValueUsd, r.estValueHighUsd)} · {r.bidCount} bid
                  {r.bidCount === 1 ? '' : 's'}
                </span>
              </Kv>
            </dl>
            <SettledMeta row={r} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy aria-label="Loading auctions">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-white/5 p-2.5">
          <Skeleton className="h-12 w-12 shrink-0 bg-white/5 md:h-12 md:w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5 bg-white/5" />
            <Skeleton className="h-3 w-1/4 bg-white/5" />
          </div>
          <Skeleton className="hidden h-6 w-20 bg-white/5 md:block" />
          <Skeleton className="hidden h-6 w-24 bg-white/5 md:block" />
          <Skeleton className="hidden h-6 w-16 bg-white/5 md:block" />
        </div>
      ))}
    </div>
  );
}
