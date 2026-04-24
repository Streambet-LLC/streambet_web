import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Gavel, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import type { AuctionSummary } from '@/types/prize';
import { format } from 'date-fns';

interface AuctionBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  prize: { id: string; name: string; imageUrl?: string };
  auction: AuctionSummary;
  /** Optional: callback to refresh parent listings after a successful bid. */
  onBidPlaced?: (next: AuctionSummary) => void;
}

/**
 * Modal for placing a proxy bid on an auction.
 *
 * Flow:
 *   1. On open we fetch the bidder's saved cards via `auctionAPI.listSavedCards`.
 *   2. If the bidder has none we show a "Save card to bid" CTA that
 *      redirects to a hosted Stripe Checkout (mode=setup). On return the
 *      modal re-opens automatically (caller is responsible for that
 *      based on the `auction_card_saved=1` query param).
 *   3. With a saved card, the bidder enters their proxy max and submits.
 *      The server runs the proxy engine and returns the new auction
 *      summary.
 *
 * We deliberately do not embed Stripe Elements here to keep the PR
 * minimal — the redirect path uses the project's existing pattern.
 */
export default function AuctionBidModal({
  isOpen,
  onClose,
  prize,
  auction,
  onBidPlaced,
}: AuctionBidModalProps) {
  const queryClient = useQueryClient();
  const [proxyMax, setProxyMax] = useState<string>(() =>
    auction.minNextBidUsd.toFixed(2)
  );

  useEffect(() => {
    if (isOpen) setProxyMax(auction.minNextBidUsd.toFixed(2));
  }, [isOpen, auction.minNextBidUsd]);

  const cardsQuery = useQuery({
    queryKey: ['auction-saved-cards'],
    queryFn: () => api.auction.listSavedCards(),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const hasCard = (cardsQuery.data?.length ?? 0) > 0;
  const primaryCard = cardsQuery.data?.[0];

  const setupCheckout = useMutation({
    mutationFn: () =>
      api.auction.createSetupCheckout(window.location.href.split('?')[0]),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => {
      toast({
        title: 'Could not start card setup',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    },
  });

  const placeBid = useMutation({
    mutationFn: () =>
      api.auction.placeBid(auction.id, {
        proxyMaxUsd: Number(proxyMax),
      }),
    onSuccess: next => {
      toast({
        title: next.isLeader ? 'You are the high bidder!' : 'You were outbid',
        description: next.isLeader
          ? `Your max of $${Number(proxyMax).toFixed(2)} stands. Current bid: $${(next.currentBidUsd ?? 0).toFixed(2)}.`
          : `Another bidder's saved max is higher. Current bid: $${(next.currentBidUsd ?? 0).toFixed(2)}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['shopItems'] });
      queryClient.invalidateQueries({ queryKey: ['auction', auction.id] });
      onBidPlaced?.(next);
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: 'Bid failed',
        description:
          err?.response?.data?.message ?? err?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const proxyMaxNumber = Number(proxyMax);
  const validBid =
    Number.isFinite(proxyMaxNumber) &&
    proxyMaxNumber >= auction.minNextBidUsd;

  /**
   * Buyer-facing fee preview for the amount the user typed. Auctions
   * apply the same 3% buyer processing fee as shop sales, computed
   * client-side so the bidder sees an accurate "total if I win" tile
   * before submitting. Server is the source of truth at close.
   */
  const feePreview = useMemo(() => {
    const pct = auction.buyerProcessingFeePercent ?? 3;
    const safeBid = Number.isFinite(proxyMaxNumber) && proxyMaxNumber > 0
      ? proxyMaxNumber
      : 0;
    const fee = +((safeBid * pct) / 100).toFixed(2);
    const total = +(safeBid + fee).toFixed(2);
    return { pct, fee, total };
  }, [auction.buyerProcessingFeePercent, proxyMaxNumber]);

  const reserveBadge = useMemo(() => {
    if (auction.reserveMet === null) return null;
    return auction.reserveMet ? (
      <span className="text-xs px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-300">
        Reserve met
      </span>
    ) : (
      <span className="text-xs px-2 py-0.5 rounded bg-amber-600/20 text-amber-300">
        Reserve not yet met
      </span>
    );
  }, [auction.reserveMet]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Gavel className="w-5 h-5" /> {prize.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>
              Ends {format(new Date(auction.endsAt), 'MMM d, p')}
            </span>
            {reserveBadge}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/40 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current bid</span>
              <span className="font-semibold">
                {auction.currentBidUsd !== null
                  ? `$${auction.currentBidUsd.toFixed(2)}`
                  : 'No bids yet'}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Minimum next bid</span>
              <span className="font-semibold">
                ${auction.minNextBidUsd.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Increment</span>
              <span>${auction.minNextBidIncrement.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Bids</span>
              <span>{auction.bidCount}</span>
            </div>
          </div>

          {cardsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading payment methods…
            </div>
          ) : hasCard ? (
            <div className="rounded-md border p-3 flex items-center gap-3">
              <CreditCard className="w-4 h-4" />
              <div className="text-sm">
                Charging{' '}
                <span className="font-medium uppercase">
                  {primaryCard!.brand}
                </span>{' '}
                ending in{' '}
                <span className="font-medium">{primaryCard!.last4}</span> if you
                win.
              </div>
            </div>
          ) : (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-amber-400" />
                <span>
                  Bidding requires a saved card. We'll only charge it if you
                  win.
                </span>
              </div>
              <Button
                className="w-full"
                onClick={() => setupCheckout.mutate()}
                disabled={setupCheckout.isPending}
              >
                {setupCheckout.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save a card to bid
              </Button>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="proxy-max">Your max bid (USD)</Label>
            <Input
              id="proxy-max"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={auction.minNextBidUsd}
              value={proxyMax}
              onChange={e => setProxyMax(e.target.value)}
              disabled={!hasCard || placeBid.isPending}
            />
            <p className="text-xs text-muted-foreground">
              We bid for you up to this amount, in ${auction.minNextBidIncrement.toFixed(2)}{' '}
              increments. You only pay the lowest amount needed to win.
            </p>
          </div>

          {/*
            Fee breakdown — mirrors the shop sale fee policy. Bidders see
            the bid + 3% buyer processing fee = total charged if they win.
            Server-computed authoritative numbers are at close time; this
            preview matches the same formula.
          */}
          <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">If you win at this max</span>
              <span className="font-medium">${proxyMaxNumber > 0 ? proxyMaxNumber.toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Buyer processing fee ({feePreview.pct}%)
              </span>
              <span>${feePreview.fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="text-muted-foreground">Total charged to your card</span>
              <span className="font-semibold">${feePreview.total.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Shipping is calculated separately at close. The actual winning
              bid is the lowest amount needed to beat the next-highest proxy,
              so you may end up paying less than your max.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => placeBid.mutate()}
              disabled={!hasCard || !validBid || placeBid.isPending}
            >
              {placeBid.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gavel className="w-4 h-4 mr-2" />
              )}
              Place bid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
