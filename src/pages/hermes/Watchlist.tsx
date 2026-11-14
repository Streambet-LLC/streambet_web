import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import { HermesShell } from '@/components/hermes/HermesShell';
import { AuctionCard } from '@/components/hermes/AuctionCard';
import { HERMES_HOME } from '@/components/hermes/site';
import { useAuthContext } from '@/contexts/AuthContext';
import { PublicAuction, hermesAPI } from '@/integrations/api/hermes';

const SECTIONS: Array<{ bucket: PublicAuction['bucket']; title: string }> = [
  { bucket: 'live', title: 'Live' },
  { bucket: 'upcoming', title: 'Upcoming' },
  { bucket: 'settled', title: 'Ended' },
];

/** Lots the signed-in user is watching: live, upcoming, then ended. */
export default function Watchlist() {
  const { session, isLoading } = useAuthContext();
  const list = useQuery({
    queryKey: ['hermes-watchlist'],
    queryFn: hermesAPI.watchlist,
    enabled: !!session,
    refetchInterval: 30_000,
  });

  if (!isLoading && !session) {
    return <Navigate to="/login?redirect=%2Fauctions%2Fwatchlist" replace />;
  }

  const rows = list.data ?? [];
  return (
    <HermesShell wide>
      <h1 className="text-2xl font-extrabold">Watchlist</h1>
      <p className="mt-1 text-sm text-white/55">
        We'll email you when a watched lot opens for bidding, an hour before it closes, and when it
        ends.
      </p>
      {list.isLoading || isLoading ? (
        <Loader2 className="mx-auto mt-16 h-6 w-6 animate-spin text-white/50" />
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 px-4 py-16 text-center">
          <p className="font-semibold">Nothing on your watchlist yet.</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/55">
            Tap the <Heart className="h-4 w-4" aria-label="heart" /> on any lot to watch it.
          </p>
          <div>
            <Link to={HERMES_HOME} className="mt-3 inline-block text-[#C7FA09] underline">
              Browse live auctions
            </Link>
          </div>
        </div>
      ) : (
        SECTIONS.map(({ bucket, title }) => {
          const group = rows.filter(a => a.bucket === bucket);
          if (group.length === 0) return null;
          return (
            <section key={bucket} className="mt-8">
              <h2 className="text-lg font-bold">
                {title}
                <span className="ml-2 text-sm font-semibold text-white/45">{group.length}</span>
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {group.map(a => (
                  <AuctionCard key={a.id} auction={a} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </HermesShell>
  );
}
