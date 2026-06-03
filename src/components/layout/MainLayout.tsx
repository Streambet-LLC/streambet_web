import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import Sidebar from '../sidebar/Sidebar';
import { cn } from '@/lib/utils';
import { BetRoundType, BettingCategory } from '@/enums';
import { useAuthContext } from '@/contexts/AuthContext';
import { SellerOnboardingBanner } from '@/components/SellerOnboardingBanner';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  showFooter?: boolean;
  isWithdraw?: boolean;
  onDashboardClick?: () => void;
  selectedCategory?: BettingCategory | null;
  setSelectedCategory?: (category: BettingCategory | null) => void;
  selectedBetType?: BetRoundType | null;
  setSelectedBetType?: (type: BetRoundType | null) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export const MainLayout = ({
  children,
  className = '',
  showFooter = true,
  isWithdraw = false,
  onDashboardClick,
  selectedCategory,
  setSelectedCategory,
  selectedBetType,
  setSelectedBetType,
  searchValue,
  onSearchChange,
}: MainLayoutProps) => {
  const location = useLocation();
  const isPredictionsPage = location.pathname === '/predictions';
  const { session } = useAuthContext();

  if (isWithdraw) {
    return (
      <div className="bg-background flex flex-col">
        <Navigation
          onDashboardClick={onDashboardClick}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
        />
        <SellerOnboardingBanner />
        <div className="w-full flex gap-2">
          {/* Background gradient overlay */}
          {/* <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div> */}

          {/* Subtle grid pattern */}
          {/* <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(189, 255, 0, 0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div> */}

          {session && (
            <Sidebar
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedBetType={selectedBetType}
              setSelectedBetType={setSelectedBetType}
            />
          )}

          {/* Main Content */}
          <main
            className={cn(
              'flex-1 flex flex-col w-full min-w-0 h-[calc(100dvh-64px)] overflow-auto',
              className
            )}
          >
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col">
      <Navigation
        onDashboardClick={onDashboardClick}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
      />
      <SellerOnboardingBanner />
      <div className="w-full flex gap-2">
        {session && (
          <Sidebar
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedBetType={selectedBetType}
            setSelectedBetType={setSelectedBetType}
          />
        )}

        <main
          className={cn(
            'flex-1 flex flex-col w-full min-w-0 h-[calc(100dvh-64px)] overflow-auto p-3 pb-24 md:p-4 z-0',
            className
          )}
        >
          {children}
          {(showFooter || isPredictionsPage) && <Footer />}
        </main>
      </div>
    </div>
  );
};
