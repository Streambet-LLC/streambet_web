import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { HermesShell } from '@/components/hermes/HermesShell';
import { AuctionClock } from '@/components/hermes/AuctionCard';
import { fmtUsd } from '@/components/hermes/format';
import { HERMES_HOME } from '@/components/hermes/site';
import { useAuthContext } from '@/contexts/AuthContext';
import { MyAuction, hermesAPI } from '@/integrations/api/hermes';

const STATE: Record<MyAuction['state'], { label: string; cls: string }> = {
  leading: { label: 'Winning', cls: 'bg-[#C7FA09] text-black' },
  outbid: { label: 'Outbid', cls: 'bg-amber-400 text-black' },
  won: { label: 'Won', cls: 'bg-[#C7FA09] text-black' },
  pay: { label: 'Payment needed', cls: 'bg-red-500 text-white' },
  lost: { label: 'Ended', cls: 'bg-white/15 text-white/80' },
};

/** Every auction the signed-in bidder has bid on. */
export default function MyBids() {
  const { session, isLoading } = useAuthContext();
  const mine = useQuery({
    queryKey: ['hermes-mine'],
    queryFn: hermesAPI.mine,
    enabled: !!session,
    refetchInterval: 30_000,
  });

  if (!isLoading && !session) return <Navigate to="/login?redirect=%2Fauctions%2Fme" replace />;

  return (
    <HermesShell>
      <h1 className="text-2xl font-extrabold">My bids</h1>
      {mine.isLoading || isLoading ? (
        <Loader2 className="mx-auto mt-16 h-6 w-6 animate-spin text-white/50" />
      ) : (mine.data ?? []).length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 py-16 text-center">
          <p className="font-semibold">You haven't bid on anything yet.</p>
          <Link to={HERMES_HOME} className="mt-2 inline-block text-[#C7FA09] underline">
            Browse live auctions
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {mine.data!.map(a => {
            const s = STATE[a.state];
            const href = a.state === 'won' || a.state === 'pay' ? `/auctions/${a.id}/pay` : `/auctions/${a.id}`;
            return (
              <li key={a.id}>
                <Link
                  to={href}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#141414] p-3 transition hover:border-white/25"
                >
                  <img
                    src={a.images[0]?.url}
                    alt=""
                    className="h-20 w-16 shrink-0 rounded-lg bg-black object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-semibold">{a.title}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {a.bucket === 'settled'
                        ? `Final ${fmtUsd(a.result?.winningBidUsd ?? a.currentBidUsd)}`
                        : `Current ${fmtUsd(a.currentBidUsd ?? a.startingPriceUsd)}`}
                      {a.viewer?.myMaxUsd != null && ` · your max ${fmtUsd(a.viewer.myMaxUsd)}`}
                    </p>
                    <div className="mt-1 text-xs">
                      <AuctionClock auction={a} />
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </HermesShell>
  );
}
