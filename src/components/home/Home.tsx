import { MainLayout } from '@/components/layout';
import HomeBets from './HomeBets';
import { SearchInput } from '@/components/ui/SearchInput';
import { useState, useEffect, useRef } from 'react';
import { BetRoundType, BettingCategory } from '@/enums';
import { useDebounce } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
import LiveFeedUpdate from './LiveFeedUpdate';

export default function Home() {
  const [filters, setFilters] = useState({});
  const [selectedCategory, setSelectedCategory] = useState<BettingCategory | null | undefined>(
    null
  );
  const [selectedBetType, setSelectedBetType] = useState<BetRoundType | null | undefined>(
    null
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
          <h1 className="text-4xl md:text-5xl font-bold flex justify-center">
            <motion.div
              className="relative inline-block"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-electric-lime to-creator-green blur-lg opacity-30"
                animate={shouldReduceMotion ? undefined : { scale: [1, 1.2, 1] }}
                transition={shouldReduceMotion ? undefined : { duration: 3, repeat: Infinity }}
              />
              <img
                src="/wordmark.svg"
                alt="CardCade"
                className="relative h-12 md:h-16 w-auto object-contain"
              />
            </motion.div>
          </h1>
          <div className="space-y-2">
            {/* <p className="text-[#FFFFFFBF]">
              Make FREE picks on cards / collectibles futures & happenings, and accrue CadeCoins for
              prizes!
            </p> */}
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
        {/* <LiveFeedUpdate /> */}
        {/* Search filter moved to navigation bar for better UX. HomeBetsFilters preserved for potential future sorting/filtering features. */}
        {/* <HomeBetsFilters onChange={setFilters} /> */}
        <HomeBets
          filters={filters}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedBetType={selectedBetType}
          setSelectedBetType={setSelectedBetType}
        />
        {/* <UpcomingHomeBets /> */}
      </div>
    </MainLayout>
  );
}
