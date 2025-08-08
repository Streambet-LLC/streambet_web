import { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  showFooter?: boolean;
  onDashboardClick?: () => void;
}

export const MainLayout = ({ 
  children, 
  className = "", 
  showFooter = true,
  onDashboardClick 
}: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation onDashboardClick={onDashboardClick} />
      
      <main className={`container flex-1 pt-24 pb-8 ${className}`}>
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}; 