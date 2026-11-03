import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bot, Store } from 'lucide-react';
import { toast } from 'sonner';
import { HermesShell } from '@/components/hermes/HermesShell';
import { MediaGallery } from '@/components/hermes/MediaGallery';
import { BidPanel } from '@/components/hermes/BidPanel';
import { SolanaProviders } from '@/components/hermes/SolanaProviders';
import { useAuctionLive } from '@/components/hermes/useAuctionLive';
import { CATEGORY_LABEL, fmtDateTime, fmtUsd } from '@/components/hermes/format';
import { Skeleton } from '@/components/ui/skeleton';
import { hermesAPI } from '@/integrations/api/hermes';

/** One Hermes lot: media, details, live bid panel and bid history. */
export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const auction = useQuery({
    queryKey: ['hermes-auction', id],
    queryFn: () => hermesAPI.get(id!),
    enabled: !!id,
    refetchInterval: 60_000,
  });
  const bids = useQuery({
    queryKey: ['hermes-bids', id],
    queryFn: () => hermesAPI.bids(id!),
    enabled: !!id,
  });
  const config = useQuery({
    queryKey: ['hermes-config'],
    queryFn: hermesAPI.config,
    staleTime: 60_000,
  });
  useAuctionLive(id);

  // Back from Stripe's hosted setup page.
  useEffect(() => {
    const setup = params.get('hermes_setup');
    if (!setup) return;
    if (setup === 'success') {
      toast.success('Payment method saved — you can bid now.');
      qc.invalidateQueries({ queryKey: ['hermes-methods'] });
    }
    params.delete('hermes_setup');
    params.delete('session_id');
    setParams(params, { replace: true });
  }, [params, setParams, qc]);

  if (auction.isLoading || config.isLoading) {
    return (
      <HermesShell>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Skeleton className="aspect-square rounded-2xl bg-white/5" />
          <Skeleton className="h-96 rounded-2xl bg-white/5" />
        </div>
      </HermesShell>
    );
  }
  if (auction.isError || !auction.data) {
    return (
      <HermesShell>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold">Auction not found.</p>
          <Link to="/auctions" className="mt-3 inline-block text-[#C7FA09] underline">
            Browse auctions
          </Link>
        </div>
      </HermesShell>
    );
  }

  const a = auction.data;
  const cfg = config.data ?? {
    crypto: {
      enabled: false,
      cluster: 'devnet' as const,
      programId: null,
      paymentMint: null,
      authority: null,
    },
    fees: a.fees,
  };
  const panel = <BidPanel auction={a} config={cfg} />;

  return (
    <HermesShell>
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/auctions'))}
        className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> All auctions
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <MediaGallery images={a.images} videos={a.videos} title={a.title} />
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C7FA09]">
              {CATEGORY_LABEL[a.category]}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{a.title}</h1>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-white/60">
              <Store className="h-4 w-4" /> Sold by{' '}
              <span className="font-semibold text-white">{a.sellerName}</span>
            </p>
          </div>
          {cfg.crypto.enabled ? (
            <SolanaProviders cluster={cfg.crypto.cluster}>{panel}</SolanaProviders>
          ) : (
            panel
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
        <section>
          <h2 className="text-lg font-bold">About this item</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">
            {a.description || 'No description provided.'}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {(
              [
                ['Starting bid', fmtUsd(a.startingPriceUsd)],
                // Omitted entirely when the seller hides it (or never set one).
                a.estValueUsd != null ? ['Est. Value', fmtUsd(a.estValueUsd)] : null,
                ['Shipping', a.shippingUsd > 0 ? fmtUsd(a.shippingUsd, { cents: true }) : 'Free'],
                ['Seller', a.sellerName],
                ['Starts', fmtDateTime(a.startsAt)],
                ['Ends', fmtDateTime(a.endsAt)],
                ['Reserve', a.hasReserve ? (a.reserveMet ? 'Met' : 'Not met') : 'None'],
              ].filter(Boolean) as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-[#141414] p-3">
                <dt className="text-[11px] uppercase tracking-wider text-white/45">{k}</dt>
                <dd className="mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {a.estValueSource === 'pulled' && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/45">
              <Bot className="h-3.5 w-3.5" /> Est. Value is based on recent comparable sales.
            </p>
          )}
          {a.extensionCount > 0 && (
            <p className="mt-2 text-xs text-white/45">
              Extended {a.extensionCount}× by late bids — the clock always leaves a minute to
              respond.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold">Bid history</h2>
          {(bids.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-white/55">No bids yet — be the first.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-[#141414]">
              {bids.data!.slice(0, 25).map(b => (
                <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-white/75">
                    {b.bidder}
                    {b.isAuto && (
                      <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/55">
                        auto
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold">{fmtUsd(b.amountUsd)}</span>
                    <span className="hidden text-xs text-white/40 sm:inline">
                      {new Date(b.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </HermesShell>
  );
}
