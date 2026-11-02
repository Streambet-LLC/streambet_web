import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Ban,
  Copy,
  ExternalLink,
  Film,
  Loader2,
  Pencil,
  RefreshCw,
  Square,
  Star,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { hermesAPI, hermesAdminAPI, type AdminAuctionDetail } from '@/integrations/api/hermes';
import { CATEGORY_LABEL, METHOD_LABEL, fmtDateTime, fmtRemaining, fmtUsd } from '../format';
import { ConfirmDialog, Pill, ReliabilityBadge, ReserveCell, StatusBadge } from './adminUi';
import {
  FIELD_CLASS,
  GHOST_BUTTON_CLASS,
  LIME_BUTTON_CLASS,
  adminKeys,
  errorMessage,
  fmtDay,
  fmtShortDateTime,
  fmtSpan,
  shortAddress,
  useNow,
  valueMethodLabel,
} from './adminUtils';

type AdminAuction = AdminAuctionDetail['auction'];

const FULFILLMENT_LABEL: Record<AdminAuction['fulfillmentStatus'], string> = {
  pending: 'Not shipped',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const DEPOSIT_TONE: Record<AdminAuctionDetail['deposits'][number]['status'], string> = {
  held: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  settled: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  refunded: 'border-white/15 bg-white/5 text-white/60',
};

/** Full admin view of one auction: terms, media, bids, escrows, payment, shipping. */
export function AdminAuctionDetailDialog({
  auctionId,
  onClose,
  onEdit,
}: {
  auctionId: string | null;
  onClose: () => void;
  onEdit: (auction: AdminAuction) => void;
}) {
  // Keep rendering the last auction while the dialog animates closed.
  const lastId = useRef(auctionId);
  if (auctionId) lastId.current = auctionId;
  const id = auctionId ?? lastId.current;

  return (
    <Dialog open={!!auctionId} onOpenChange={o => !o && onClose()}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden border-white/10 bg-[rgba(18,18,18,1)] p-0 text-white sm:w-[calc(100%-2rem)]">
        {id && <DetailBody id={id} onEdit={onEdit} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({ id, onEdit }: { id: string; onEdit: (a: AdminAuction) => void }) {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: adminKeys.detail(id),
    queryFn: () => hermesAdminAPI.get(id),
    refetchInterval: query => {
      const s = query.state.data?.auction.status;
      return s === 'active' || s === 'scheduled' ? 15_000 : false;
    },
  });
  const [confirm, setConfirm] = useState<'close' | 'cancel' | null>(null);

  const applyResult = (d: AdminAuctionDetail) => {
    queryClient.setQueryData(adminKeys.detail(d.auction.id), d);
    void queryClient.invalidateQueries({ queryKey: adminKeys.lists });
  };

  const forceClose = useMutation({
    mutationFn: () => hermesAdminAPI.forceClose(id),
    onSuccess: d => {
      applyResult(d);
      setConfirm(null);
      toast.success('Auction closed.');
    },
    onError: err => toast.error(errorMessage(err, "Couldn't close the auction.")),
  });
  const cancel = useMutation({
    mutationFn: () => hermesAdminAPI.cancel(id),
    onSuccess: d => {
      applyResult(d);
      setConfirm(null);
      toast.success('Auction cancelled.');
    },
    onError: err => toast.error(errorMessage(err, "Couldn't cancel the auction.")),
  });

  const a = q.data?.auction;
  const isLive = a?.status === 'active';
  const now = useNow(isLive || a?.status === 'scheduled' ? 1000 : 0);

  if (q.isPending) {
    return (
      <>
        <DialogHeader className="sr-only">
          <DialogTitle>Loading auction</DialogTitle>
          <DialogDescription>Loading the auction details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-4 sm:p-6" aria-busy>
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 shrink-0 bg-white/5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3 bg-white/5" />
              <Skeleton className="h-4 w-1/3 bg-white/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-white/5" />
            ))}
          </div>
          <Skeleton className="h-40 bg-white/5" />
        </div>
      </>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-white">Couldn't load this auction</DialogTitle>
          <DialogDescription>
            {errorMessage(q.error, 'The auction may not exist.')}
          </DialogDescription>
        </DialogHeader>
        <Button
          type="button"
          variant="outline"
          className={cn(GHOST_BUTTON_CLASS, 'mt-4')}
          onClick={() => void q.refetch()}
        >
          <RefreshCw /> Try again
        </Button>
      </div>
    );
  }

  const d = q.data;
  const auction = d.auction;
  const endsMs = new Date(auction.endsAt).getTime();
  const startsMs = new Date(auction.startsAt).getTime();
  const overdue = (auction.status === 'active' || auction.status === 'scheduled') && endsMs < now;
  const highBid = auction.winningAmountUsd ?? auction.currentBidUsd;
  // The API spreads the whole entity; the leader id is there even though
  // the client type doesn't declare it.
  const leaderId =
    auction.winnerUserId ??
    (auction as AdminAuction & { currentLeaderUserId?: string | null }).currentLeaderUserId ??
    null;
  // Bids come newest first, so this is the leader's current bid.
  const leaderBid = leaderId ? d.bids.find(b => b.userId === leaderId) : undefined;
  const canClose = auction.status === 'active' || auction.status === 'scheduled';
  const canCancel = auction.status !== 'cancelled';
  const settledish = ['ended', 'paid', 'failed', 'unsold'].includes(auction.status);
  const leaderLabel = auction.winnerUserId
    ? 'Winner'
    : auction.status === 'active'
      ? 'Leading'
      : 'High bidder';
  const lengthLabel =
    auction.lengthPreset && auction.lengthPreset !== 'custom'
      ? `${auction.lengthPreset} days`
      : `Custom · ${fmtSpan(endsMs - startsMs)}`;

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-4 py-4 pr-12 sm:px-6">
        <div className="flex gap-3 sm:gap-4">
          {auction.images[0] ? (
            <img
              src={auction.images[0].url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-md border border-white/10 object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-md border border-white/10 bg-white/5 sm:h-20 sm:w-20" />
          )}
          <DialogHeader className="min-w-0 flex-1 space-y-1.5 text-left">
            <DialogTitle className="line-clamp-2 text-base leading-snug text-white sm:text-lg">
              {auction.title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={auction.status} />
                <Pill className="border-white/10 bg-white/5 text-white/70">
                  {CATEGORY_LABEL[auction.category] ?? auction.category}
                </Pill>
                {auction.isFeatured && (
                  <Pill className="border-[#C7FA09]/30 bg-[#C7FA09]/10 text-[#C7FA09]">
                    <Star className="h-3 w-3 fill-current" aria-hidden /> Featured
                  </Pill>
                )}
                {q.isFetching && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin text-white/40"
                    aria-label="Refreshing"
                  />
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {auction.status !== 'cancelled' && (
            <Button
              type="button"
              size="sm"
              className={cn(LIME_BUTTON_CLASS, 'h-8')}
              onClick={() => onEdit(auction)}
            >
              <Pencil /> Edit
            </Button>
          )}
          {canClose && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(GHOST_BUTTON_CLASS, 'h-8')}
              onClick={() => setConfirm('close')}
            >
              <Square /> Close now
            </Button>
          )}
          {canCancel && (
            // Wrapper carries the tooltip: disabled buttons swallow no pointer events.
            <span
              className="inline-flex"
              title={
                auction.status === 'paid'
                  ? 'Paid auctions must be refunded in Stripe first.'
                  : undefined
              }
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={auction.status === 'paid'}
                className="h-8 border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100"
                onClick={() => setConfirm('cancel')}
              >
                <Ban /> Cancel auction
              </Button>
            </span>
          )}
          <Button asChild size="sm" variant="outline" className={cn(GHOST_BUTTON_CLASS, 'h-8')}>
            <a href={`/auctions/${auction.id}`} target="_blank" rel="noreferrer">
              <ExternalLink /> View public page
            </a>
          </Button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
        {overdue && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/[0.07] px-3 py-2.5 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              This auction passed its end time {fmtShortDateTime(auction.endsAt)} but hasn't settled
              yet. The sweeper should close it within a minute — or use <strong>Close now</strong>.
            </span>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label={settledish ? 'Winning bid' : 'Current bid'}
            value={
              <span className="text-lg font-bold text-white">
                {highBid != null ? fmtUsd(highBid) : '—'}
              </span>
            }
            sub={
              highBid == null
                ? `Starts at ${fmtUsd(auction.startingPriceUsd)}`
                : leaderBid && !settledish
                  ? `Leader: ${leaderBid.username ?? leaderBid.email ?? 'bidder'}`
                  : undefined
            }
          />
          <Stat
            label="Leader's max"
            value={auction.proxyMaxUsd != null ? fmtUsd(auction.proxyMaxUsd) : '—'}
            sub="Private proxy ceiling"
          />
          <Stat
            label="Bids"
            value={auction.bidCount}
            sub={
              auction.extensionCount
                ? `${auction.extensionCount} extension${auction.extensionCount === 1 ? '' : 's'}`
                : undefined
            }
          />
          <Stat
            label="Reserve"
            value={<ReserveCell reserveUsd={auction.reservePriceUsd} bidUsd={highBid} compact />}
          />
          <Stat label="Starting bid" value={fmtUsd(auction.startingPriceUsd)} />
          <Stat label="Shipping" value={fmtUsd(auction.shippingUsd)} sub="Flat, paid by buyer" />
          <Stat
            label="Est. value"
            value={fmtUsd(auction.estValueUsd)}
            sub={
              auction.estValueSource
                ? auction.estValueSource === 'pulled'
                  ? 'Pulled from sales'
                  : 'Entered manually'
                : undefined
            }
          />
          <Stat label="Length" value={lengthLabel} />
          <Stat
            label={startsMs > now ? 'Starts' : 'Started'}
            value={<span className="text-sm">{fmtDateTime(auction.startsAt)}</span>}
            sub={
              auction.status === 'scheduled' && startsMs > now
                ? `in ${fmtRemaining(startsMs - now)}`
                : undefined
            }
            wide
          />
          <Stat
            label={endsMs > now ? 'Ends' : 'Ended'}
            value={<span className="text-sm">{fmtDateTime(auction.endsAt)}</span>}
            sub={
              isLive && endsMs > now ? (
                <span className="font-semibold text-[#C7FA09]">
                  {fmtRemaining(endsMs - now)} left
                </span>
              ) : undefined
            }
            wide
          />
        </dl>

        {/* Media */}
        {(auction.images.length > 0 || auction.videos.length > 0) && (
          <DetailSection
            title={`Media (${auction.images.length} photo${auction.images.length === 1 ? '' : 's'}${auction.videos.length ? `, ${auction.videos.length} video${auction.videos.length === 1 ? '' : 's'}` : ''})`}
          >
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {auction.images.map((img, i) => (
                <li key={img.key} className="shrink-0">
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]"
                  >
                    <img
                      src={img.url}
                      alt={`Photo ${i + 1}${i === 0 ? ' (cover)' : ''}`}
                      className="h-24 w-24 object-cover"
                      loading="lazy"
                    />
                  </a>
                </li>
              ))}
            </ul>
            {auction.videos.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {auction.videos.map((v, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <Film className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />
                    <span className="shrink-0 font-medium text-white/80">
                      {v.kind === 'upload' ? 'Upload' : v.kind === 'youtube' ? 'YouTube' : 'Vimeo'}
                    </span>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-muted-foreground hover:text-white hover:underline"
                    >
                      {v.url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        )}

        {auction.description?.trim() && (
          <DetailSection title="Description">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">
              {auction.description}
            </p>
          </DetailSection>
        )}

        {auction.estValueMeta && (
          <DetailSection title="Est. value research">
            <details className="group rounded-md border border-white/10 bg-black/30">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5 text-sm text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]/60">
                <span className="font-semibold text-white">
                  {fmtUsd(auction.estValueMeta.pointUsd)}
                </span>
                <span className="text-xs text-white/55">
                  {fmtUsd(auction.estValueMeta.lowUsd)} – {fmtUsd(auction.estValueMeta.highUsd)}
                </span>
                <ReliabilityBadge reliability={auction.estValueMeta.reliability} />
                {auction.estValueMeta.confidencePct != null && (
                  <span className="text-xs text-white/55">
                    {auction.estValueMeta.confidencePct}% confidence
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground group-open:hidden">
                  Show comps
                </span>
                <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">
                  Hide comps
                </span>
              </summary>
              <div className="border-t border-white/10 px-3 py-2.5 text-xs">
                <p className="text-white/70">
                  “{auction.estValueMeta.subject}” · {valueMethodLabel(auction.estValueMeta.method)}{' '}
                  · pulled {fmtShortDateTime(auction.estValueMeta.pulledAt)}
                </p>
                {auction.estValueMeta.note && (
                  <p className="mt-1 text-white/70">{auction.estValueMeta.note}</p>
                )}
                {auction.estValueMeta.comps.length > 0 && (
                  <ul className="mt-2 divide-y divide-white/5">
                    {auction.estValueMeta.comps.map((c, i) => (
                      <li key={i} className="flex justify-between gap-3 py-1.5">
                        <span className="min-w-0">
                          {c.url ? (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-white/85 hover:text-[#C7FA09] hover:underline"
                            >
                              {c.title || 'Sale'}
                            </a>
                          ) : (
                            <span className="text-white/85">{c.title || 'Sale'}</span>
                          )}
                          <span className="block text-muted-foreground">
                            {fmtDay(c.date)}
                            {c.source ? ` · ${c.source}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-white">
                          {fmtUsd(c.priceUsd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          </DetailSection>
        )}

        {(d.winner || settledish) && <ResultSection detail={d} now={now} />}

        {auction.status === 'paid' && <FulfillmentSection detail={d} onUpdated={applyResult} />}

        <DetailSection title={`Bid history (${d.bids.length})`}>
          {d.bids.length === 0 ? (
            <p className="rounded-md border border-dashed border-white/10 px-3 py-6 text-center text-sm text-muted-foreground">
              No bids yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-white/10">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-2.5 py-2 font-medium">
                      Time
                    </th>
                    <th scope="col" className="px-2.5 py-2 font-medium">
                      Bidder
                    </th>
                    <th scope="col" className="px-2.5 py-2 text-right font-medium">
                      Amount
                    </th>
                    <th scope="col" className="px-2.5 py-2 text-right font-medium">
                      Max
                    </th>
                    <th scope="col" className="px-2.5 py-2 font-medium">
                      Type
                    </th>
                    <th scope="col" className="px-2.5 py-2 font-medium">
                      Funding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.bids.map(b => (
                    <tr key={b.id} className="border-b border-white/5 last:border-0">
                      <td className="whitespace-nowrap px-2.5 py-2 text-white/70">
                        {fmtShortDateTime(b.createdAt)}
                      </td>
                      <td className="px-2.5 py-2">
                        <span className="block font-medium text-white">
                          {b.username ?? '—'}
                          {b.id === leaderBid?.id && (
                            <Pill className="ml-1.5 border-[#C7FA09]/30 bg-[#C7FA09]/10 text-[#C7FA09]">
                              {leaderLabel}
                            </Pill>
                          )}
                        </span>
                        {b.email && <span className="block text-muted-foreground">{b.email}</span>}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-right font-semibold tabular-nums text-white">
                        {fmtUsd(b.amountUsd)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-right tabular-nums text-white/70">
                        {fmtUsd(b.proxyMaxUsd)}
                      </td>
                      <td className="px-2.5 py-2">
                        {b.isAuto ? (
                          <Pill className="border-sky-400/30 bg-sky-400/10 text-sky-300">Auto</Pill>
                        ) : (
                          <span className="text-white/60">Manual</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-white/70">
                        {METHOD_LABEL[b.fundingMethod] ?? b.fundingMethod}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailSection>

        {d.deposits.length > 0 && <EscrowSection deposits={d.deposits} />}
      </div>

      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={o => !o && setConfirm(null)}
        title="Close this auction now?"
        body={
          auction.status === 'scheduled'
            ? "It hasn't opened yet, so it ends now with no bids."
            : 'Bidding stops immediately and the auction settles as if time ran out — the high bidder wins if the reserve is met.'
        }
        confirmLabel="Close now"
        destructive
        pending={forceClose.isPending}
        onConfirm={() => forceClose.mutate()}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={o => !o && setConfirm(null)}
        title="Cancel this auction?"
        body="Bidding stops, nobody wins, and any USDC escrowed for it is refunded. This can't be undone."
        confirmLabel="Cancel auction"
        destructive
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      />
    </>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  wide,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-white/10 bg-black/30 px-3 py-2',
        wide && 'col-span-2'
      )}
    >
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-white/90">{value}</dd>
      {sub && <dd className="mt-0.5 text-[11px] text-white/50">{sub}</dd>}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm tabular-nums text-white/90">{children}</dd>
    </div>
  );
}

function ResultSection({ detail, now }: { detail: AdminAuctionDetail; now: number }) {
  const a = detail.auction;
  const w = detail.winner;
  const hammer = a.winningAmountUsd;
  const total =
    a.totalChargedUsd ??
    (hammer != null ? hammer + (a.shippingUsd ?? 0) + (a.cardFeeUsd ?? 0) : null);
  const dueMs = a.paymentDueAt ? new Date(a.paymentDueAt).getTime() : null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied.');
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  return (
    <DetailSection title="Result & payment">
      {a.status === 'unsold' && !w ? (
        <p className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white/70">
          Ended without a sale
          {a.bidCount === 0
            ? ' — no bids.'
            : a.reservePriceUsd != null
              ? ' — the reserve was not met.'
              : '.'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Winner</p>
            {w ? (
              <>
                <p className="mt-0.5 font-semibold text-white">{w.username}</p>
                <a
                  href={`mailto:${w.email}`}
                  className="text-sm text-white/70 hover:text-[#C7FA09] hover:underline"
                >
                  {w.email}
                </a>
              </>
            ) : (
              <p className="mt-0.5 text-sm text-white/60">—</p>
            )}
            {a.status === 'ended' && dueMs && (
              <p className={cn('mt-2 text-xs', dueMs < now ? 'text-red-300' : 'text-amber-300')}>
                {dueMs < now ? 'Payment overdue since ' : 'Must pay by '}
                {fmtDateTime(a.paymentDueAt!)}
                {dueMs > now && ` (${fmtRemaining(dueMs - now)} left)`}
              </p>
            )}
            {a.status === 'failed' && (
              <p className="mt-2 text-xs text-red-300">
                Payment failed — the buyer hasn't completed checkout.
              </p>
            )}
          </div>

          <dl className="divide-y divide-white/5 rounded-md border border-white/10 bg-black/30 px-3 py-1">
            <Row label="Method">{a.paymentMethod ? METHOD_LABEL[a.paymentMethod] : '—'}</Row>
            <Row label="Hammer">{fmtUsd(hammer)}</Row>
            <Row label="Shipping">{fmtUsd(a.shippingUsd)}</Row>
            <Row label="Card fee">
              {a.cardFeeUsd != null ? fmtUsd(a.cardFeeUsd, { cents: true }) : '—'}
            </Row>
            <Row label="Total">
              <span className="font-semibold text-white">
                {total != null ? fmtUsd(total, { cents: true }) : '—'}
              </span>
            </Row>
            <Row label="Stripe PaymentIntent">
              {a.paymentIntentId ? (
                <button
                  type="button"
                  onClick={() => void copy(a.paymentIntentId!)}
                  className="inline-flex max-w-[180px] items-center gap-1 font-mono text-xs text-white/80 hover:text-[#C7FA09] sm:max-w-[240px]"
                  title="Copy"
                >
                  <span className="truncate">{a.paymentIntentId}</span>
                  <Copy className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="sr-only">Copy PaymentIntent id</span>
                </button>
              ) : (
                '—'
              )}
            </Row>
            <Row label={a.paidAt ? 'Paid at' : 'Pay by'}>
              {a.paidAt
                ? fmtShortDateTime(a.paidAt)
                : a.paymentDueAt
                  ? fmtShortDateTime(a.paymentDueAt)
                  : '—'}
            </Row>
          </dl>
        </div>
      )}
    </DetailSection>
  );
}

function FulfillmentSection({
  detail,
  onUpdated,
}: {
  detail: AdminAuctionDetail;
  onUpdated: (d: AdminAuctionDetail) => void;
}) {
  const a = detail.auction;
  const addr = a.shippingAddress;
  const [editing, setEditing] = useState(a.fulfillmentStatus === 'pending');
  const [carrier, setCarrier] = useState(a.carrier ?? '');
  const [tracking, setTracking] = useState(a.trackingNumber ?? '');

  const ship = useMutation({
    mutationFn: () => hermesAdminAPI.ship(a.id, carrier.trim(), tracking.trim()),
    onSuccess: d => {
      onUpdated(d);
      setEditing(false);
      toast.success('Marked shipped — the buyer has been emailed.');
    },
    onError: err => toast.error(errorMessage(err, "Couldn't mark it shipped.")),
  });

  return (
    <DetailSection title="Shipping & fulfillment">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ship to</p>
          {addr ? (
            <address className="mt-1 not-italic leading-relaxed text-white/85">
              {addr.firstName} {addr.lastName}
              <br />
              {addr.addressLine1}
              {addr.addressLine2 && (
                <>
                  <br />
                  {addr.addressLine2}
                </>
              )}
              <br />
              {addr.city}, {addr.state} {addr.zipCode}
              <br />
              {addr.country}
            </address>
          ) : (
            <p className="mt-1 text-white/60">No shipping address on file.</p>
          )}
        </div>

        <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fulfillment</p>
            <Pill
              className={
                a.fulfillmentStatus === 'pending'
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                  : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              }
            >
              {FULFILLMENT_LABEL[a.fulfillmentStatus]}
            </Pill>
          </div>
          {a.fulfillmentStatus !== 'pending' && !editing && (
            <div className="mt-1.5 text-sm text-white/85">
              <p>
                {a.carrier} · <span className="font-mono text-xs">{a.trackingNumber}</span>
              </p>
              {a.shippedAt && (
                <p className="text-xs text-muted-foreground">
                  Shipped {fmtShortDateTime(a.shippedAt)}
                </p>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:text-white hover:underline"
              >
                Update tracking
              </button>
            </div>
          )}
          {editing && (
            <form
              className="mt-2 space-y-2"
              onSubmit={e => {
                e.preventDefault();
                if (carrier.trim() && tracking.trim()) ship.mutate();
              }}
            >
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div>
                  <Label htmlFor={`carrier-${a.id}`} className="text-xs text-white/70">
                    Carrier
                  </Label>
                  <Input
                    id={`carrier-${a.id}`}
                    list={`carriers-${a.id}`}
                    value={carrier}
                    maxLength={64}
                    onChange={e => setCarrier(e.target.value)}
                    placeholder="USPS"
                    className={cn(FIELD_CLASS, 'mt-1 h-9')}
                  />
                  <datalist id={`carriers-${a.id}`}>
                    <option value="USPS" />
                    <option value="UPS" />
                    <option value="FedEx" />
                    <option value="DHL" />
                  </datalist>
                </div>
                <div>
                  <Label htmlFor={`tracking-${a.id}`} className="text-xs text-white/70">
                    Tracking number
                  </Label>
                  <Input
                    id={`tracking-${a.id}`}
                    value={tracking}
                    maxLength={128}
                    onChange={e => setTracking(e.target.value)}
                    autoComplete="off"
                    className={cn(FIELD_CLASS, 'mt-1 h-9 font-mono')}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!carrier.trim() || !tracking.trim() || ship.isPending}
                  className={cn(LIME_BUTTON_CLASS, 'h-8')}
                >
                  {ship.isPending ? <Loader2 className="animate-spin" /> : <Truck />}
                  Mark shipped
                </Button>
                {a.fulfillmentStatus !== 'pending' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(GHOST_BUTTON_CLASS, 'h-8')}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </DetailSection>
  );
}

function EscrowSection({ deposits }: { deposits: AdminAuctionDetail['deposits'] }) {
  const config = useQuery({
    queryKey: ['hermes-admin', 'config'],
    queryFn: hermesAPI.config,
    staleTime: Infinity,
  });
  const cluster = config.data?.crypto.cluster;
  const suffix = cluster === 'mainnet-beta' ? '' : '?cluster=devnet';
  const txUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}${suffix}`;
  const addrUrl = (addr: string) => `https://explorer.solana.com/address/${addr}${suffix}`;

  return (
    <DetailSection title={`USDC escrows (${deposits.length})`}>
      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-2.5 py-2 font-medium">
                Wallet
              </th>
              <th scope="col" className="px-2.5 py-2 font-medium">
                Escrow
              </th>
              <th scope="col" className="px-2.5 py-2 text-right font-medium">
                Amount
              </th>
              <th scope="col" className="px-2.5 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-2.5 py-2 font-medium">
                Transactions
              </th>
            </tr>
          </thead>
          <tbody>
            {deposits.map(dep => (
              <tr key={dep.id} className="border-b border-white/5 last:border-0">
                <td className="px-2.5 py-2">
                  <ExplorerLink
                    href={addrUrl(dep.wallet)}
                    label={shortAddress(dep.wallet)}
                    title={dep.wallet}
                  />
                </td>
                <td className="px-2.5 py-2">
                  <ExplorerLink
                    href={addrUrl(dep.escrow)}
                    label={shortAddress(dep.escrow)}
                    title={dep.escrow}
                  />
                </td>
                <td className="whitespace-nowrap px-2.5 py-2 text-right font-semibold tabular-nums text-white">
                  {fmtUsd(dep.amountUsd, { cents: true })}
                </td>
                <td className="px-2.5 py-2">
                  <Pill className={DEPOSIT_TONE[dep.status]}>
                    {dep.status.charAt(0).toUpperCase() + dep.status.slice(1)}
                  </Pill>
                </td>
                <td className="px-2.5 py-2">
                  <div className="flex flex-col gap-0.5">
                    {dep.settleSignature && (
                      <ExplorerLink
                        href={txUrl(dep.settleSignature)}
                        label={`Settle ${shortAddress(dep.settleSignature, 5)}`}
                        title={dep.settleSignature}
                      />
                    )}
                    {dep.refundSignature && (
                      <ExplorerLink
                        href={txUrl(dep.refundSignature)}
                        label={`Refund ${shortAddress(dep.refundSignature, 5)}`}
                        title={dep.refundSignature}
                      />
                    )}
                    {!dep.settleSignature && !dep.refundSignature && (
                      <span className="text-white/40">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DetailSection>
  );
}

function ExplorerLink({ href, label, title }: { href: string; label: string; title?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className="inline-flex items-center gap-1 font-mono text-white/80 hover:text-[#C7FA09] hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
    </a>
  );
}
