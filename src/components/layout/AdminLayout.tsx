import { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';

interface AdminLayoutProps {
  children: ReactNode;
  className?: string;
  onDashboardClick?: () => void;
  isStreamContent?: boolean;
}

export const AdminLayout = ({ 
  children, 
  className = "",
  onDashboardClick,
  isStreamContent = false
}: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation onDashboardClick={onDashboardClick} />
      <div className={`container flex w-full pt-24 pb-8 ${isStreamContent ? 'px-0 md:px-4 lg:px-6' : ''}`}>
        <main className={`flex-1 ${className}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
