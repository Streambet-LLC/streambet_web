import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CreditCard, Gavel, Loader2, MapPin, Plus, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  FundingMethod,
  HermesConfig,
  PublicAuction,
  SavedPaymentMethod,
  hermesAPI,
} from '@/integrations/api/hermes';
import { getMessage } from '@/utils/helper';
import { AuctionClock, PaymentsBadge, ReserveBadge, SoftCloseHint } from './AuctionCard';
import { buyerPremiumFor, cardFeeFor, fmtDateTime, fmtMethodLabel, fmtUsd } from './format';
import { ShippingAddressForm, fetchMyAddress, isAddressComplete } from './ShippingAddressForm';
import { UsdcEscrow } from './UsdcEscrow';

const METHODS: Array<{
  key: FundingMethod;
  label: string;
  note: string;
  icon: typeof CreditCard;
}> = [
  { key: 'ach', label: 'Bank (ACH)', note: 'No processing fee', icon: Building2 },
  { key: 'card', label: 'Card', note: '+ card processing', icon: CreditCard },
  { key: 'usdc', label: 'USDC', note: 'No processing fee · escrowed', icon: Gavel },
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** "a", "a and b", "a, b and c". */
function listJoin(items: string[]) {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Bid box for the auction detail page (also shows results once it ends). */
export function BidPanel({ auction, config }: { auction: PublicAuction; config: HermesConfig }) {
  const { session } = useAuthContext();
  const location = useLocation();
  const qc = useQueryClient();
  const redirect = encodeURIComponent(location.pathname);
  const isAdmin = session?.role === 'admin';
  const viewer = auction.viewer;
  const upcoming = auction.bucket === 'upcoming';
  const settled = auction.bucket === 'settled';

  const address = useQuery({
    queryKey: ['hermes-address'],
    queryFn: fetchMyAddress,
    enabled: !!session && !settled && !isAdmin,
  });
  // Saved card / bank: always refetch on mount and when the tab regains
  // focus, so a method saved on Stripe (or in another tab) shows right away.
  const methods = useQuery({
    queryKey: ['hermes-methods'],
    queryFn: hermesAPI.paymentMethods,
    enabled: !!session && !settled && !isAdmin,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const [editingAddress, setEditingAddress] = useState(false);
  const [method, setMethod] = useState<FundingMethod>(viewer?.fundingMethod ?? 'ach');
  const [pmId, setPmId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const savedOfKind: SavedPaymentMethod[] = useMemo(
    () => (methods.data ?? []).filter(m => m.kind === method),
    [methods.data, method]
  );

  // Only the rails this auction accepts (and USDC only once the escrow is live).
  const allowed = useMemo(
    () =>
      METHODS.filter(
        m =>
          (auction.acceptedMethods ?? ['card', 'ach', 'usdc']).includes(m.key) &&
          (m.key !== 'usdc' || config.crypto.enabled)
      ),
    [auction.acceptedMethods, config.crypto.enabled]
  );
  useEffect(() => {
    if (allowed.length && !allowed.some(m => m.key === method)) setMethod(allowed[0].key);
  }, [allowed, method]);

  // Default to whatever the bidder already has saved.
  useEffect(() => {
    if (viewer?.fundingMethod || !methods.data) return;
    const ok = (k: FundingMethod) => allowed.some(m => m.key === k);
    if (ok('ach') && methods.data.some(m => m.kind === 'ach')) setMethod('ach');
    else if (ok('card') && methods.data.some(m => m.kind === 'card')) setMethod('card');
  }, [methods.data, viewer?.fundingMethod, allowed]);
  useEffect(() => {
    setPmId(savedOfKind[0]?.id);
  }, [savedOfKind]);

  const minBid =
    viewer?.isLeader && viewer.myMaxUsd
      ? round2(viewer.myMaxUsd + auction.minIncrementUsd)
      : auction.minNextBidUsd;
  useEffect(() => {
    setAmount(String(minBid));
  }, [minBid]);

  const maxBid = Number(amount);
  const validAmount = Number.isFinite(maxBid) && maxBid >= minBid;
  const shipping = auction.shippingUsd;
  const premiumPct = auction.fees.buyerPremiumPercent ?? 0;
  // Worst case is winning at the max: premium on it, card processing on everything.
  const atMax = validAmount ? maxBid : minBid;
  const premium = buyerPremiumFor(atMax, premiumPct);
  const fee =
    method === 'card'
      ? cardFeeFor(
          round2(atMax + premium + shipping),
          auction.fees.cardProcessingPercent,
          auction.fees.cardProcessingFixedUsd
        )
      : 0;
  const worstCase = round2(atMax + premium + shipping + fee);
  const confirmExtras = [
    ...(premiumPct > 0 ? [`a ${premiumPct}% buyer premium`] : []),
    `${fmtUsd(shipping, { cents: true })} shipping`,
    ...(method === 'card' ? ['card processing'] : []),
  ];

  const bid = useMutation({
    mutationFn: () =>
      hermesAPI.placeBid(auction.id, {
        proxyMaxUsd: round2(maxBid),
        fundingMethod: method,
        ...(method !== 'usdc' && pmId ? { stripePaymentMethodId: pmId } : {}),
      }),
    onSuccess: r => {
      setConfirmOpen(false);
      if (r.leading) toast.success(`You're the high bidder at ${fmtUsd(r.currentBidUsd)}`);
      else
        toast.warning(
          `Another bidder's max is higher — current bid is now ${fmtUsd(r.currentBidUsd)}. Try a higher max.`
        );
      qc.invalidateQueries({ queryKey: ['hermes-auction', auction.id] });
      qc.invalidateQueries({ queryKey: ['hermes-bids', auction.id] });
    },
    onError: err => toast.error(getMessage(err) || 'Bid failed.'),
  });

  const setup = useMutation({
    mutationFn: (kind: 'card' | 'ach') =>
      hermesAPI.paymentSetup(kind, `${window.location.origin}${location.pathname}`),
    onSuccess: r => {
      window.location.href = r.url;
    },
    onError: err => toast.error(getMessage(err) || 'Could not start Stripe.'),
  });

  // ── Ended ──────────────────────────────────────────────────────────────
  if (settled) {
    const sold = auction.result?.sold;
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Auction ended
        </p>
        {auction.status === 'cancelled' ? (
          <p className="mt-2 text-lg font-bold">This auction was cancelled.</p>
        ) : sold ? (
          <>
            <p className="mt-2 text-3xl font-extrabold">{fmtUsd(auction.result?.winningBidUsd)}</p>
            <p className="text-sm text-white/60">
              Won by {auction.result?.winner ?? 'a bidder'} · {auction.bidCount} bids
            </p>
          </>
        ) : (
          <p className="mt-2 text-lg font-bold">
            {auction.bidCount ? 'Reserve not met — did not sell.' : 'Closed with no bids.'}
          </p>
        )}
        {viewer?.isWinner && (
          <Button
            asChild
            className="mt-4 h-11 w-full bg-[#C7FA09] font-bold text-black hover:bg-[#d6ff3d]"
          >
            <Link to={`/auctions/${auction.id}/pay`}>
              <Trophy className="mr-2 h-4 w-4" /> You won — view payment
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const header = (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/50">
            {auction.currentBidUsd != null ? 'Current bid' : 'Starting bid'}
          </p>
          <p className="text-4xl font-extrabold tracking-tight">
            {fmtUsd(auction.currentBidUsd ?? auction.startingPriceUsd)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {auction.bidCount} bid{auction.bidCount === 1 ? '' : 's'}
            {auction.leader ? ` · leading: ${auction.leader}` : ''}
          </p>
        </div>
        <div className="text-right text-sm">
          <AuctionClock auction={auction} />
          <p className="mt-1 text-xs text-white/45">
            {upcoming
              ? `Opens ${fmtDateTime(auction.startsAt)}`
              : `Ends ${fmtDateTime(auction.endsAt)}`}
          </p>
          <SoftCloseHint auction={auction} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ReserveBadge auction={auction} />
        {auction.estValueUsd != null && (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/75">
            Est. Value {fmtUsd(auction.estValueUsd)}
          </span>
        )}
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/75">
          Shipping {shipping > 0 ? fmtUsd(shipping, { cents: true }) : 'free'}
        </span>
        {premiumPct > 0 ? (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/75">
            {premiumPct}% buyer premium
          </span>
        ) : (
          <span className="rounded-full bg-[#C7FA09]/10 px-2 py-0.5 text-[11px] font-semibold text-[#C7FA09]">
            0% buyer premium
          </span>
        )}
        <span className="rounded-full border border-white/25 px-2 py-0.5 text-[11px] font-semibold text-white/90">
          All bids are final
        </span>
        {auction.acceptedPayments !== 'both' && (
          <PaymentsBadge accepted={auction.acceptedPayments} />
        )}
      </div>
      {viewer?.isLeader && (
        <div className="rounded-xl border border-[#C7FA09]/40 bg-[#C7FA09]/10 px-3 py-2 text-sm">
          <span className="font-bold text-[#C7FA09]">You're the high bidder.</span> Your max is{' '}
          {fmtUsd(viewer.myMaxUsd)} — we'll bid for you up to that.
        </div>
      )}
      {viewer?.isBidder && !viewer.isLeader && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          You've been outbid. Raise your max to get back in front.
        </div>
      )}
    </div>
  );

  const shell = (body: React.ReactNode) => (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-[#141414] p-5">
      {header}
      {body}
    </div>
  );

  if (!session) {
    return shell(
      <div className="space-y-2">
        <Button
          asChild
          className="h-11 w-full bg-[#C7FA09] font-bold text-black hover:bg-[#d6ff3d]"
        >
          <Link to={`/signup?redirect=${redirect}`}>Sign up to bid</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 w-full border-white/15 bg-transparent text-white hover:bg-white/5"
        >
          <Link to={`/login?redirect=${redirect}`}>Log in</Link>
        </Button>
      </div>
    );
  }

  if (isAdmin) {
    return shell(
      <p className="text-sm text-white/60">
        You're signed in as the house, so you can't bid. Manage this auction in{' '}
        <Link
          to={`/analytics?tab=auctions&auction=${auction.id}`}
          className="text-[#C7FA09] underline"
        >
          admin
        </Link>
        .
      </p>
    );
  }

  if (address.isLoading) {
    return shell(<Loader2 className="mx-auto h-5 w-5 animate-spin text-white/50" />);
  }

  if (!isAddressComplete(address.data) || editingAddress) {
    return shell(
      <ShippingAddressForm
        initial={address.data}
        onSaved={a => {
          qc.setQueryData(['hermes-address'], a);
          setEditingAddress(false);
          toast.success('Shipping address saved');
        }}
      />
    );
  }

  if (allowed.length === 0) {
    return shell(
      <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
        This auction accepts USDC only, and USDC bidding isn't available right now. Check back soon.
      </p>
    );
  }

  const escrow = viewer?.escrowUsd ?? 0;
  // A USDC win settles hammer + premium + shipping from escrow.
  const usdcRequired = round2(atMax + premium + shipping);
  const usdcCovered = escrow >= usdcRequired;
  const canBid = !upcoming && validAmount && (method === 'usdc' ? usdcCovered : !!pmId);

  return shell(
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
          Pay with
        </p>
        <div
          className={`grid gap-2 ${
            allowed.length === 3
              ? 'grid-cols-3'
              : allowed.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-1'
          }`}
        >
          {allowed.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMethod(m.key)}
              aria-pressed={method === m.key}
              className={`rounded-xl border px-2 py-2.5 text-left transition ${
                method === m.key
                  ? 'border-[#C7FA09] bg-[#C7FA09]/10'
                  : 'border-white/10 bg-black/30 hover:border-white/25'
              }`}
            >
              <m.icon
                className={`h-4 w-4 ${method === m.key ? 'text-[#C7FA09]' : 'text-white/60'}`}
              />
              <p className="mt-1 text-sm font-semibold">{m.label}</p>
              <p className="text-[11px] text-white/50">{m.note}</p>
            </button>
          ))}
        </div>
      </div>

      {method !== 'usdc' ? (
        <div className="space-y-2">
          {methods.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/50" />
          ) : savedOfKind.length > 0 ? (
            <select
              value={pmId}
              onChange={e => setPmId(e.target.value)}
              aria-label="Saved payment method"
              className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white"
            >
              {savedOfKind.map(m => (
                <option key={m.id} value={m.id}>
                  {fmtMethodLabel(m)} •••• {m.last4}
                  {m.expMonth
                    ? ` · ${String(m.expMonth).padStart(2, '0')}/${String(m.expYear).slice(-2)}`
                    : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-white/55">
              {method === 'ach'
                ? 'Link a bank account once (instant verification). It is only charged if you win.'
                : 'Save a card once. It is only charged if you win.'}
            </p>
          )}
          <button
            type="button"
            onClick={() => setup.mutate(method as 'card' | 'ach')}
            disabled={setup.isPending}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#C7FA09] hover:underline disabled:opacity-50"
          >
            {setup.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            {method === 'ach'
              ? savedOfKind.length > 0
                ? 'Link another bank account'
                : 'Link a bank account'
              : savedOfKind.length > 0
                ? 'Add another card'
                : 'Add a card'}
          </button>
        </div>
      ) : (
        <UsdcEscrow
          auctionId={auction.id}
          escrowUsd={escrow}
          requiredUsd={usdcRequired}
          cluster={config.crypto.cluster}
          premiumPct={premiumPct}
        />
      )}

      <div>
        <label
          htmlFor="max-bid"
          className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50"
        >
          {viewer?.isLeader ? 'Raise your max bid' : 'Your max bid'}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
              $
            </span>
            <Input
              id="max-bid"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              className="h-12 border-white/10 bg-black/40 pl-7 text-lg font-bold text-white"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[0, 1, 3].map(steps => {
            const v = round2(minBid + steps * auction.minIncrementUsd);
            return (
              <button
                key={steps}
                type="button"
                onClick={() => setAmount(String(v))}
                className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/80 hover:border-[#C7FA09]/60"
              >
                {fmtUsd(v)}
              </button>
            );
          })}
        </div>
        {!validAmount && amount !== '' && (
          <p className="mt-1 text-xs text-red-400">Minimum is {fmtUsd(minBid)}.</p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-white/45">
          We bid for you automatically, only as much as needed to keep you in front, up to your max.
          {premiumPct > 0
            ? `If you win, you pay the winning bid (not your max) plus the ${premiumPct}% buyer premium on it.`
            : 'You pay the winning bid, not your max.'}
        </p>
      </div>

      <div className="space-y-1 rounded-xl bg-black/30 p-3 text-xs">
        <div className="flex justify-between text-white/60">
          <span>Max bid</span>
          <span>{fmtUsd(atMax, { cents: true })}</span>
        </div>
        <div className="flex justify-between text-white/60">
          <span>Buyer premium ({premiumPct}%)</span>
          {premiumPct > 0 ? (
            <span>{fmtUsd(premium, { cents: true })}</span>
          ) : (
            <span className="text-[#C7FA09]">$0.00</span>
          )}
        </div>
        <div className="flex justify-between text-white/60">
          <span>Shipping</span>
          <span>{fmtUsd(shipping, { cents: true })}</span>
        </div>
        {method === 'card' && (
          <div className="flex justify-between text-white/60">
            <span>Card processing</span>
            <span>{fmtUsd(fee, { cents: true })}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-white/10 pt-1 text-sm font-bold">
          <span>Most you'd pay</span>
          <span>{fmtUsd(worstCase, { cents: true })}</span>
        </div>
      </div>

      <Button
        type="button"
        disabled={!canBid || bid.isPending}
        onClick={() => setConfirmOpen(true)}
        className="h-12 w-full bg-[#C7FA09] text-base font-extrabold text-black hover:bg-[#d6ff3d] disabled:opacity-40"
      >
        {upcoming
          ? 'Bidding opens soon'
          : viewer?.isLeader
            ? `Raise max to ${fmtUsd(validAmount ? maxBid : minBid)}`
            : `Bid up to ${fmtUsd(validAmount ? maxBid : minBid)}`}
      </Button>

      <button
        type="button"
        onClick={() => setEditingAddress(true)}
        className="flex w-full items-center justify-center gap-1 text-[11px] text-white/45 hover:text-white/70"
      >
        <MapPin className="h-3 w-3" />
        Ships to {address.data?.city}, {address.data?.state} · change
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-white/10 bg-[#141414] text-white">
          <DialogHeader>
            <DialogTitle>Confirm your max bid</DialogTitle>
            <DialogDescription className="text-white/60">
              If you win, you'll pay the winning bid (at most {fmtUsd(maxBid, { cents: true })})
              plus {listJoin(confirmExtras)} — at most {fmtUsd(worstCase, { cents: true })} in total
              {method === 'usdc'
                ? ', settled from your USDC escrow.'
                : `, charged to your ${method === 'ach' ? 'bank account' : 'card'} when the auction ends.`}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
            <span className="font-bold">All bids are final.</span> Once placed, a bid can't be
            withdrawn or lowered.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="border-white/15 bg-transparent text-white"
            >
              Back
            </Button>
            <Button
              onClick={() => bid.mutate()}
              disabled={bid.isPending}
              className="bg-[#C7FA09] font-bold text-black hover:bg-[#d6ff3d]"
            >
              {bid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Place bid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
