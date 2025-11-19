import BetCard from '@/components/BetCard';
import { MainLayout } from '@/components/layout';
import HomePromotedBets from './HomePromotedBets';
import HomeBets from './HomeBets';
import UpcomingHomeBets from './UpcomingHomeBets';
import HomeBetsFilters from './HomeBetsFilters';
import { useState } from 'react';

export default function Home() {
  const [filters, setFilters] = useState({});

  return (
    <MainLayout showFooter>
      <div className="w-full flex flex-col gap-6">
        <div className="max-w-3xl mx-auto text-center space-y-4 p-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Predict the Internet's <br />
            <span className="text-[#BDFF00]">randomest</span> moments
          </h1>
          <p className="text-[#FFFFFFBF]">
            Real $$$ picks on neosports, Sunday leagues, and games created on the Internet.
          </p>
        </div>
        <HomePromotedBets />
        {/* <HomeBetsFilters onChange={setFilters} /> */}
        <HomeBets filters={filters} />
        {/* <UpcomingHomeBets /> */}
      </div>
    </MainLayout>
  );
}
