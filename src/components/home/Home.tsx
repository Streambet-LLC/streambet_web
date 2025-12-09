import BetCard from '@/components/BetCard';
import { MainLayout } from '@/components/layout';
import HomePromotedBets from './HomePromotedBets';
import HomeBets from './HomeBets';
import UpcomingHomeBets from './UpcomingHomeBets';
import HomeBetsFilters from './HomeBetsFilters';
import { useState } from 'react';
import { BettingCategory } from '@/enums';
import { motion } from 'framer-motion';

export default function Home() {
  const [filters, setFilters] = useState({});
  const [selectedCategory, setSelectedCategory] = useState<BettingCategory | null>(null);

  return (
    <MainLayout showFooter selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}>
      <div className="w-full flex flex-col gap-6">
        <div className="max-w-3xl mx-auto text-center space-y-4 p-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Predict the Internet's <br />
            <motion.span 
              className="relative inline-block"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-[#bdff00] to-[#7aff14] blur-lg opacity-30"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <span className="relative bg-gradient-to-r from-[#bdff00] to-[#7aff14] bg-clip-text text-transparent">
                randomest
              </span>
            </motion.span> moments
          </h1>
          <p className="text-[#FFFFFFBF]">
            Real $$$ picks on neosports, Sunday leagues, and games created on the Internet.
          </p>
        </div>
        <HomePromotedBets />
        <HomeBetsFilters onChange={setFilters} />
        <HomeBets filters={filters} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
        {/* <UpcomingHomeBets /> */}
      </div>
    </MainLayout>
  );
}
