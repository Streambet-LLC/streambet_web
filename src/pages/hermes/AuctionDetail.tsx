import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bot, ChevronDown, Store } from 'lucide-react';
import { toast } from 'sonner';
import { HermesShell } from '@/components/hermes/HermesShell';
import { MediaGallery } from '@/components/hermes/MediaGallery';
import { BidPanel } from '@/components/hermes/BidPanel';
import { SolanaProviders } from '@/components/hermes/SolanaProviders';
import { WatchButton } from '@/components/hermes/WatchButton';
import { useAuctionLive } from '@/components/hermes/useAuctionLive';
import {
  CATEGORY_LABEL,
  fmtDateTime,
  fmtEstValue,
  fmtExtensionWindow,
  fmtUsd,
} from '@/components/hermes/format';
import { Skeleton } from '@/components/ui/skeleton';
import { hermesAPI, type PublicAuction, type PublicBid } from '@/integrations/api/hermes';
import { HERMES_HOME } from '@/components/hermes/site';
import { pixelViewContent } from '@/lib/metaPixel';

/** One Hermes lot: media, details, live bid panel and bid history. */
export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const qc = useQueryClient();

  // Back to the marketplace, with its filters when the lot was opened from
  // it (AuctionCard passes `state.from`); otherwise the marketplace home.
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from && /^\/(\?|$)/.test(from) && !from.startsWith('//') ? from : HERMES_HOME;

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

  // Meta Pixel ViewContent, once per lot opened (not on each refetch).
  const lotTitle = auction.data?.title;
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || lotTitle == null || viewedRef.current === id) return;
    viewedRef.current = id;
    pixelViewContent({ id, title: lotTitle });
  }, [id, lotTitle]);

  // A back/forward cache restore (e.g. coming back from Stripe) revives the
  // page exactly as it was, with stale bids and saved methods. Refresh them.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        qc.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('hermes') });
      }
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [qc]);

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
          <Link to={HERMES_HOME} className="mt-3 inline-block text-[#C7FA09] underline">
            Browse auctions
          </Link>
        </div>
      </HermesShell>
    );
  }

  const a = auction.data;
  const softClose = fmtExtensionWindow(a.extensionWindowSeconds);
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
  const about = <AboutSection a={a} softClose={softClose} />;
  const history = <BidHistory bids={bids.data} />;

  return (
    <HermesShell>
      {/* A real link, never history-back: after a Stripe card setup the
          previous history entry is Stripe. Keeps marketplace filters when
          the lot was opened from the marketplace. */}
      <Link
        to={backTo}
        className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> All auctions
      </Link>

      {/* Desktop: photos + description on the left, bid panel + history on
          the right (no gap under the photos). Phones: the column wrappers
          dissolve (`contents`) and `order` interleaves photos, bid panel,
          description, history. */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-10">
        <div className="contents lg:block lg:min-w-0 lg:space-y-10">
          <div className="order-1 min-w-0">
            <MediaGallery images={a.images} videos={a.videos} title={a.title} />
          </div>
          {about}
        </div>

        <div className="contents lg:block lg:min-w-0 lg:space-y-10">
          <div className="order-2 min-w-0 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C7FA09]">
                {CATEGORY_LABEL[a.category]}
              </p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{a.title}</h1>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-white/60">
                <Store className="h-4 w-4" /> Sold by{' '}
                <span className="font-semibold text-white">{a.sellerName}</span>
              </p>
              <div className="mt-3">
                <WatchButton auction={a} />
              </div>
            </div>
            {cfg.crypto.enabled ? (
              <SolanaProviders cluster={cfg.crypto.cluster}>{panel}</SolanaProviders>
            ) : (
              panel
            )}
          </div>
          {history}
        </div>
      </div>
    </HermesShell>
  );
}

function AboutSection({ a, softClose }: { a: PublicAuction; softClose: string }) {
  return (
    <section className="order-3 min-w-0">
      <h2 className="text-lg font-bold">About this item</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">
        {a.description || 'No description provided.'}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {(
          [
            ['Starting bid', fmtUsd(a.startingPriceUsd)],
            // Omitted entirely when the seller hides it (or never set one).
            a.estValueUsd != null
              ? ['Est. Value', fmtEstValue(a.estValueUsd, a.estValueHighUsd)]
              : null,
            ['Shipping', a.shippingUsd > 0 ? fmtUsd(a.shippingUsd, { cents: true }) : 'Free'],
            ['Seller', a.sellerName],
            ['Starts', fmtDateTime(a.startsAt)],
            ['Ends', fmtDateTime(a.endsAt)],
            [
              'Reserve',
              !a.hasReserve
                ? 'None'
                : `${a.reservePriceUsd != null ? `${fmtUsd(a.reservePriceUsd)} · ` : ''}${
                    a.reserveMet ? 'Met' : 'Not met'
                  }`,
            ],
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
      {(a.bucket !== 'settled' || a.extensionCount > 0) && (
        <p className="mt-2 text-xs text-white/45">
          {a.extensionCount > 0 && `Extended ${a.extensionCount}× by late bids. `}
          {a.bucket !== 'settled' &&
            `Soft close: a bid in the final ${softClose} resets the clock to ${softClose}, so nobody gets sniped.`}
        </p>
      )}
    </section>
  );
}

/** Collapsible bid list: closed by default, the header shows the count and the latest bid. */
function BidHistory({ bids }: { bids: PublicBid[] | undefined }) {
  const [open, setOpen] = useState(false);
  const list = bids ?? [];
  if (list.length === 0) {
    return (
      <section className="order-4 min-w-0">
        <h2 className="text-lg font-bold">Bid history</h2>
        <p className="mt-3 text-sm text-white/55">No bids yet — be the first.</p>
      </section>
    );
  }
  const latest = list[0];
  return (
    <section className="order-4 min-w-0">
      <h2>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="bid-history-list"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-left transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]/60"
        >
          <span>
            <span className="text-lg font-bold">Bid history</span>
            <span className="ml-2 text-sm font-semibold text-white/50">
              {list.length} bid{list.length === 1 ? '' : 's'}
            </span>
          </span>
          <span className="flex items-center gap-3 text-sm">
            {!open && (
              <span className="text-white/60">
                Latest <span className="font-semibold text-white">{fmtUsd(latest.amountUsd)}</span>
                <span className="hidden sm:inline"> by {latest.bidder}</span>
              </span>
            )}
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </span>
        </button>
      </h2>
      {open && (
        <ul
          id="bid-history-list"
          className="mt-2 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-[#141414]"
        >
          {list.slice(0, 25).map(b => (
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
                    timeZoneName: 'short',
                  })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
