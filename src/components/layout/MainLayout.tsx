import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import Sidebar from '../sidebar/Sidebar';
import { cn } from '@/lib/utils';
import { BettingCategory } from '@/enums';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  showFooter?: boolean;
  isWithdraw?: boolean;
  onDashboardClick?: () => void;
  selectedCategory?: BettingCategory | null;
  setSelectedCategory?: (category: BettingCategory | null) => void;
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
  searchValue,
  onSearchChange,
}: MainLayoutProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (isWithdraw) {
    return (
      <div className="bg-background flex flex-col">
        <Navigation
          onDashboardClick={onDashboardClick}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
        />
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

          <Sidebar selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />

          {/* Main Content */}
          <main
            className={cn('flex-1 flex flex-col h-[calc(100dvh-64px)] overflow-auto', className)}
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
      <div className="w-full flex gap-2">
        <div className="h-[calc(100dvh-64px)] overflow-x-auto">
          <Sidebar selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
        </div>

        <main
          className={cn(
            'flex-1 flex flex-col h-[calc(100dvh-64px)] overflow-auto p-4 pb-8 z-0',
            className
          )}
        >
          {children}
          {(showFooter || isHomePage) && <Footer />}
        </main>
      </div>
    </div>
  );
};
