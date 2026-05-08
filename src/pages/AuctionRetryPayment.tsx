import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertTriangle, CheckCircle2, Home, Clock } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';

interface PaymentStatus {
  auctionId: string;
  status: string;
  canRetry: boolean;
  itemName: string;
  prizeConfigurationId: string;
  winningBidUsd: number;
  buyerProcessingFeeUsd: number;
  shippingUsd: number;
  totalDueUsd: number;
  graceDeadline: string | null;
  paymentIntentId: string | null;
}

const formatUsd = (amount: number) =>
  amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function formatRemaining(deadlineIso: string | null): string | null {
  if (!deadlineIso) return null;
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default function AuctionRetryPayment() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const retryFlag = searchParams.get('auction_retry');

  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PaymentStatus>({
    queryKey: ['auction-payment-status', auctionId],
    queryFn: () => api.auction.getPaymentStatus(auctionId as string),
    enabled: Boolean(auctionId),
    refetchInterval: query => {
      const data = query.state.data as PaymentStatus | undefined;
      // After a successful Stripe redirect, poll briefly until the
      // webhook flips the auction to PAID. Server returns the enum
      // value lowercased (`'paid'`), so compare case-insensitively
      // — otherwise polling never stops and the success branch below
      // never matches, leaving the user on the misleading "no longer
      // waiting on you" screen.
      if (
        retryFlag === 'success' &&
        data &&
        data.status?.toLowerCase() !== 'paid'
      ) {
        return 3000;
      }
      return false;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!auctionId) throw new Error('Missing auction id');
      const returnUrl = window.location.origin + window.location.pathname;
      return api.auction.createRetryCheckout(auctionId, returnUrl);
    },
    onSuccess: ({ url }) => {
      if (url) {
        window.location.href = url;
      } else {
        toast({
          title: 'Could not start checkout',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      }
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        'Could not start checkout. Please try again.';
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
    },
  });

  // Surface success/cancel toasts from the Stripe Checkout redirect.
  useEffect(() => {
    if (retryFlag === 'success') {
      toast({
        title: 'Payment received',
        description: 'Finalising your order — this usually takes a few seconds.',
      });
    } else if (retryFlag === 'cancel') {
      toast({
        title: 'Checkout cancelled',
        description: 'You can try again whenever you like before the deadline.',
      });
      // Strip the flag so a refresh doesn't re-fire the toast.
      const next = new URLSearchParams(searchParams);
      next.delete('auction_retry');
      setSearchParams(next, { replace: true });
    }
  }, [retryFlag, searchParams, setSearchParams]);

  // Once the webhook flips status to PAID, clear the polling flag.
  // Status is lowercased on the wire, so normalise before comparing.
  useEffect(() => {
    if (retryFlag === 'success' && status?.status?.toLowerCase() === 'paid') {
      const next = new URLSearchParams(searchParams);
      next.delete('auction_retry');
      setSearchParams(next, { replace: true });
    }
  }, [retryFlag, status?.status, searchParams, setSearchParams]);

  const remaining = useMemo(
    () => formatRemaining(status?.graceDeadline ?? null),
    [status?.graceDeadline]
  );

  if (!auctionId) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Missing auction reference.</p>
          <Button onClick={() => navigate('/')}>
            <Home className="mr-2 h-4 w-4" /> Return home
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (isError || !status) {
    const message =
      (error as { response?: { data?: { message?: string } } } | undefined)?.response?.data
        ?.message || 'Could not load this auction.';
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <p className="text-muted-foreground">{message}</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  Try again
                </Button>
                <Button onClick={() => navigate('/inbox')}>Open inbox</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Already paid — show success and route the winner to their orders.
  // The API returns the AuctionStatus enum value as-is (lowercase
  // `'paid'`), so we normalise before comparing. Without this the page
  // falls through to the `!canRetry` branch and shows the misleading
  // "This auction is no longer waiting on you" screen even though the
  // charge succeeded.
  if (status.status?.toLowerCase() === 'paid') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-12">
          <Card className="overflow-hidden">
            <div className="bg-green-600 px-6 py-8 text-center">
              <CheckCircle2 className="h-14 w-14 text-white mx-auto mb-3" />
              <h1 className="text-2xl font-semibold text-white">Payment complete</h1>
              <p className="text-green-50 mt-1">
                {status.itemName} is yours — we've sent a confirmation email.
              </p>
            </div>
            <CardContent className="py-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate('/redemptions')}>
                View my orders
              </Button>
              <Button onClick={() => navigate('/')}>
                <Home className="mr-2 h-4 w-4" /> Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Auction is no longer eligible for retry (e.g. moved on to runner-up).
  if (!status.canRetry) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <h1 className="text-xl font-semibold">This auction is no longer waiting on you</h1>
              <p className="text-muted-foreground">
                The 24-hour retry window for {status.itemName} has closed and the item has been
                offered to the next bidder. No charge was made.
              </p>
              <Button onClick={() => navigate('/my-bids')}>Back to my bids</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card className="overflow-hidden">
          <div className="bg-amber-600 px-6 py-8 text-center">
            <CreditCard className="h-12 w-12 text-white mx-auto mb-3" />
            <h1 className="text-2xl font-semibold text-white">Complete your purchase</h1>
            <p className="text-amber-50 mt-1">
              Your card was declined for {status.itemName}. Retry the same card or pay with a
              different one — your win is held until the deadline.
            </p>
          </div>

          <CardContent className="py-6 space-y-6">
            {remaining && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{remaining}</span>
              </div>
            )}

            <div className="rounded-md border border-border divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted-foreground">Winning bid</span>
                <span className="font-medium">{formatUsd(status.winningBidUsd)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted-foreground">Processing fee</span>
                <span className="font-medium">{formatUsd(status.buyerProcessingFeeUsd)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {status.shippingUsd > 0 ? formatUsd(status.shippingUsd) : 'Free'}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-base">
                <span className="font-semibold">Total due</span>
                <span className="font-semibold">{formatUsd(status.totalDueUsd)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" /> Pay with card
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                You can use the card we tried, or enter a new one on the next screen. New cards are
                saved to your account for future auctions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
