import { MainLayout } from '@/components/layout';
import HomePromotedBets from './HomePromotedBets';
import HomeBets from './HomeBets';
import { SearchInput } from '@/components/ui/SearchInput';
// import HomeBetsFilters from './HomeBetsFilters'; // Search moved to navigation bar, but keeping for potential future use
import { useState, useEffect, useRef } from 'react';
import { BetRoundType, BettingCategory } from '@/enums';
import { useDebounce } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
import LiveFeedUpdate from './LiveFeedUpdate';
import HomeBetTypes from './HomeBetTypes';

export default function Home() {
  const [filters, setFilters] = useState({});
  const [selectedCategory, setSelectedCategory] = useState<BettingCategory | null | undefined>(
    undefined
  );
  const [selectedBetType, setSelectedBetType] = useState<BetRoundType | null | undefined>(
    undefined
  );
  const [searchValue, setSearchValue] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const homeRef = useRef<HTMLDivElement>();

  const debouncedSearch = useDebounce(() => {
    const term = searchValue.trim();
    setFilters(term ? { search: term } : {});
  });

  useEffect(() => {
    debouncedSearch();
  }, [searchValue]);

  return (
    <MainLayout
      showFooter
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedBetType={selectedBetType}
      setSelectedBetType={setSelectedBetType}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      selectedBetType={selectedBetType}
      setSelectedBetType={setSelectedBetType}
    >
      <div className="w-full flex flex-col gap-6" ref={homeRef}>
        {/* Mobile Search Bar - Only visible on mobile */}
        <div className="sm:hidden px-4 pt-2">
          <SearchInput
            id="mobile-search"
            value={searchValue}
            onChange={setSearchValue}
            width="full"
            placeholder="Search Picks, creators, streams..."
            className="border-primary/60 shadow-[0_0_8px_rgba(189,255,0,0.3)]"
          />
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-4 p-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Data markets for the
            <br />
            <motion.span
              className="relative inline-block"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-[#bdff00] to-[#7aff14] blur-lg opacity-30"
                animate={shouldReduceMotion ? undefined : { scale: [1, 1.2, 1] }}
                transition={shouldReduceMotion ? undefined : { duration: 3, repeat: Infinity }}
              />
              <span className="relative bg-gradient-to-r from-[#bdff00] to-[#7aff14] bg-clip-text text-transparent">
                collector's
              </span>
            </motion.span>{' '}
            age
          </h1>
          <div className="space-y-2">
            <p className="text-[#FFFFFFBF]">
              Make FREE picks on cards / collectibles futures & happenings, and accrue CadeCoins for
              prizes!
            </p>
            {/* <p className="text-xs text-[#FFFFFF80]">
              Check out{' '}
              <a
                href="https://pro.cardcade.fun"
                className="text-[#bdff00] hover:underline transition-all"
              >
                CardCade Pro
              </a>{' '}
              for real $$$ action! [Late Feb]
            </p> */}
          </div>
        </div>
        <LiveFeedUpdate />
        <HomePromotedBets />
        {/* Search filter moved to navigation bar for better UX. HomeBetsFilters preserved for potential future sorting/filtering features. */}
        {/* <HomeBetsFilters onChange={setFilters} /> */}
        <HomeBets
          filters={filters}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedBetType={selectedBetType}
          setSelectedBetType={setSelectedBetType}
        />
        <HomeBetTypes
          filters={filters}
          selectedBetType={selectedBetType}
          setSelectedBetType={setSelectedBetType}
        />
        {/* <UpcomingHomeBets /> */}
      </div>
    </MainLayout>
  );
}
