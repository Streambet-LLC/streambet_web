import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, CreditCard, Loader2, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { HermesShell } from '@/components/hermes/HermesShell';
import { METHOD_LABEL, fmtDateTime, fmtUsd } from '@/components/hermes/format';
import { useCountdown } from '@/components/hermes/useCountdown';
import { fmtRemaining } from '@/components/hermes/format';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { hermesAPI } from '@/integrations/api/hermes';
import { getMessage } from '@/utils/helper';

/** Winner's page: receipt once paid, or finish payment if autopay needs help. */
export default function AuctionPay() {
  const { id } = useParams<{ id: string }>();
  const { session, isLoading: sessionLoading } = useAuthContext();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const [method, setMethod] = useState<'ach' | 'card'>('ach');
  const confirmedRef = useRef(false);

  const info = useQuery({
    queryKey: ['hermes-pay', id],
    queryFn: () => hermesAPI.payment(id!),
    enabled: !!id && !!session,
    refetchInterval: q => (q.state.data?.status === 'paid' ? false : 10_000),
  });

  // Returning from Stripe Checkout: confirm server-side (pull, not webhook).
  useEffect(() => {
    const status = params.get('hermes_pay');
    const sessionId = params.get('session_id');
    if (!status || !id || confirmedRef.current) return;
    confirmedRef.current = true;
    if (status === 'success' && sessionId) {
      hermesAPI
        .paymentConfirm(id, sessionId)
        .then(d => {
          qc.setQueryData(['hermes-pay', id], d);
          toast.success(d.status === 'paid' ? 'Payment received — thank you!' : 'Payment submitted — processing.');
        })
        .catch(err => toast.error(getMessage(err) || 'Could not confirm payment yet.'));
    } else if (status === 'cancel') {
      toast.message('Payment not completed.');
    }
    params.delete('hermes_pay');
    params.delete('session_id');
    setParams(params, { replace: true });
  }, [params, setParams, id, qc]);

  const checkout = useMutation({
    mutationFn: () =>
      hermesAPI.paymentCheckout(id!, method, `${window.location.origin}/auctions/${id}/pay`),
    onSuccess: r => {
      window.location.href = r.url;
    },
    onError: err => toast.error(getMessage(err) || 'Could not start checkout.'),
  });

  const due = useCountdown(info.data?.paymentDueAt);

  if (!sessionLoading && !session) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`/auctions/${id}/pay`)}`} replace />;
  }
  if (info.isLoading || sessionLoading) {
    return (
      <HermesShell>
        <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-white/50" />
      </HermesShell>
    );
  }
  if (info.isError || !info.data) {
    return (
      <HermesShell>
        <div className="py-20 text-center">
          <p className="font-semibold">{getMessage(info.error) || 'Nothing to pay here.'}</p>
          <Link to={`/auctions/${id}`} className="mt-3 inline-block text-[#C7FA09] underline">
            Back to auction
          </Link>
        </div>
      </HermesShell>
    );
  }

  const p = info.data;
  const paid = p.status === 'paid';
  const processing = p.intentStatus === 'processing';
  const opt = p.options[method];

  return (
    <HermesShell>
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#141414] p-4">
          {p.image && <img src={p.image} alt="" className="h-20 w-20 rounded-lg bg-black object-contain" />}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C7FA09]">You won</p>
            <Link to={`/auctions/${p.auctionId}`} className="line-clamp-2 font-bold hover:underline">
              {p.title}
            </Link>
          </div>
        </div>

        {paid ? (
          <div className="space-y-4 rounded-2xl border border-[#C7FA09]/40 bg-[#C7FA09]/5 p-5">
            <div className="flex items-center gap-2 text-lg font-bold">
              <CheckCircle2 className="h-5 w-5 text-[#C7FA09]" /> Paid
              {p.paidAt && <span className="text-sm font-normal text-white/50">· {fmtDateTime(p.paidAt)}</span>}
            </div>
            <Breakdown
              rows={[
                ['Winning bid', p.hammerUsd],
                ['Shipping', p.shippingUsd],
                ...(p.cardFeeUsd > 0 ? ([['Card processing', p.cardFeeUsd]] as [string, number][]) : []),
              ]}
              total={p.totalUsd}
              method={p.paymentMethod ? METHOD_LABEL[p.paymentMethod] : undefined}
            />
            <div className="rounded-xl bg-black/30 p-3 text-sm">
              {p.fulfillment.status === 'shipped' ? (
                <p className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#C7FA09]" /> Shipped via {p.fulfillment.carrier} ·{' '}
                  <span className="font-mono">{p.fulfillment.trackingNumber}</span>
                </p>
              ) : (
                <p className="flex items-center gap-2 text-white/70">
                  <Package className="h-4 w-4" /> Preparing to ship
                  {p.shippingAddress && ` to ${p.shippingAddress.city}, ${p.shippingAddress.state}`}.
                </p>
              )}
            </div>
          </div>
        ) : processing ? (
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 text-sm">
            <p className="font-bold">Bank payment processing</p>
            <p className="mt-1 text-white/65">
              ACH payments usually clear in 1–4 business days. We'll email you and ship as soon as it
              clears.
            </p>
            <div className="mt-4">
              <Breakdown rows={[['Winning bid', p.hammerUsd], ['Shipping', p.shippingUsd]]} total={p.totalUsd} />
            </div>
          </div>
        ) : p.canPay ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-[#141414] p-5">
            <div>
              <p className="text-lg font-bold">Finish your payment</p>
              <p className="mt-1 text-sm text-white/65">
                We couldn't complete the charge on your saved payment method. Pay below to keep
                your win
                {p.paymentDueAt && (
                  <>
                    {' '}— <span className="font-semibold text-amber-300">{fmtRemaining(due)} left</span> (by{' '}
                    {fmtDateTime(p.paymentDueAt)})
                  </>
                )}
                .
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['ach', 'Bank (ACH)', 'No fees', Building2],
                  ['card', 'Card', '+ processing', CreditCard],
                ] as const
              ).map(([k, label, note, Icon]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={method === k}
                  onClick={() => setMethod(k)}
                  className={`rounded-xl border p-3 text-left ${
                    method === k ? 'border-[#C7FA09] bg-[#C7FA09]/10' : 'border-white/10 bg-black/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <p className="mt-1 text-sm font-semibold">{label}</p>
                  <p className="text-[11px] text-white/50">{note}</p>
                </button>
              ))}
            </div>
            <Breakdown
              rows={[
                ['Winning bid', opt.hammerUsd],
                ['Shipping', opt.shippingUsd],
                ...(opt.cardFeeUsd > 0 ? ([['Card processing', opt.cardFeeUsd]] as [string, number][]) : []),
              ]}
              total={opt.totalUsd}
            />
            <Button
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending}
              className="h-12 w-full bg-[#C7FA09] text-base font-extrabold text-black hover:bg-[#d6ff3d]"
            >
              {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${fmtUsd(opt.totalUsd, { cents: true })}`}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 text-sm text-white/70">
            {p.status === 'unsold'
              ? 'The payment window for this auction has closed.'
              : 'Your payment is being processed. This page updates automatically.'}
          </div>
        )}
      </div>
    </HermesShell>
  );
}

function Breakdown({
  rows,
  total,
  method,
}: {
  rows: [string, number][];
  total: number;
  method?: string;
}) {
  return (
    <div className="space-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between text-white/65">
          <span>{k}</span>
          <span>{fmtUsd(v, { cents: true })}</span>
        </div>
      ))}
      <div className="flex justify-between text-white/65">
        <span>Buyer premium</span>
        <span className="text-[#C7FA09]">$0.00</span>
      </div>
      <div className="flex justify-between border-t border-white/10 pt-1 font-bold">
        <span>Total{method ? ` · ${method}` : ''}</span>
        <span>{fmtUsd(total, { cents: true })}</span>
      </div>
    </div>
  );
}
