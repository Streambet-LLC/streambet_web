import { MainLayout } from '@/components/layout';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';

const Leaderboard = () => {
  return (
    <MainLayout showFooter={false}>
      <div className="w-full max-w-7xl mx-auto mt-8">
        <h1 className="sr-only">Leaderboard</h1>
        <LeaderboardTable />
      </div>
    </MainLayout>
  );
};

export default Leaderboard;
