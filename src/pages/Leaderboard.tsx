import { MainLayout } from '@/components/layout';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

const Leaderboard = () => {
  const { session } = useAuthContext();
  const userShopUrl = session?.username ? `/shop/${session.username}` : '/shop';
  return (
    <MainLayout showFooter={false}>
      <div className="w-full max-w-6xl mx-auto mt-8 pb-16">
        <h1 className="sr-only">Leaderboard</h1>

        {/* Info Banner - Retro CRT Style */}
        <div
          className="mb-6 p-6 border-2 relative overflow-hidden"
          style={{
            borderColor: 'var(--electric-lime)',
            background: 'rgba(0, 0, 0, 0.8)',
            boxShadow: '0 0 20px rgba(189, 255, 0, 0.2), inset 0 0 20px rgba(189, 255, 0, 0.05)',
          }}
        >
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(189, 255, 0, 0.1)',
                  border: '2px solid var(--electric-lime)',
                  boxShadow: '0 0 10px rgba(189, 255, 0, 0.3)',
                }}
              >
                <Info className="w-5 h-5" style={{ color: 'var(--electric-lime)' }} />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <h3
                className="text-lg font-bold uppercase tracking-wide"
                style={{
                  color: 'var(--electric-lime)',
                  textShadow: '0 0 10px rgba(189, 255, 0, 0.5)',
                }}
              >
                📊 Track Your Progress
              </h3>
              <div className="space-y-2 text-sm text-white/90">
                <p>The leaderboard shows the top players ranked by current CadeCoins balance.</p>
                <ul className="space-y-1 ml-4">
                  <li className="flex items-start gap-2">
                    <span style={{ color: 'var(--electric-lime)' }}>•</span>
                    <span>
                      <strong style={{ color: 'var(--electric-lime)' }}>THIS MONTH:</strong> Coins
                      earned in the current calendar month
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: 'var(--electric-lime)' }}>•</span>
                    <span>
                      <strong style={{ color: 'var(--electric-lime)' }}>CURRENT BALANCE:</strong>{' '}
                      Your current coin balance
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: 'var(--electric-lime)' }}>•</span>
                    <span>
                      <strong style={{ color: 'var(--electric-lime)' }}>ALL-TIME EARNINGS:</strong>{' '}
                      Total coins earned since you joined
                    </span>
                  </li>
                </ul>
                <p className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(189, 255, 0, 0.2)' }}>
                  Earn coins by{' '}
                  <Link
                    to="/"
                    className="underline hover:no-underline transition-all"
                    style={{
                      color: 'var(--electric-lime)',
                      textShadow: '0 0 5px rgba(189, 255, 0, 0.3)',
                    }}
                  >
                    making purchases
                  </Link>
                  ,{' '}
                  <Link
                    to={userShopUrl}
                    className="underline hover:no-underline transition-all"
                    style={{
                      color: 'var(--electric-lime)',
                      textShadow: '0 0 5px rgba(189, 255, 0, 0.3)',
                    }}
                  >
                    selling items
                  </Link>
                  , and spinning the{' '}
                  <Link
                    to="/daily-spin"
                    className="underline hover:no-underline transition-all"
                    style={{
                      color: 'var(--electric-lime)',
                      textShadow: '0 0 5px rgba(189, 255, 0, 0.3)',
                    }}
                  >
                    daily spin
                  </Link>
                  !
                </p>
              </div>
            </div>
          </div>
        </div>

        <LeaderboardTable />
      </div>
    </MainLayout>
  );
};

export default Leaderboard;
