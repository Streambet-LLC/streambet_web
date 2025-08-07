import { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';

interface AdminLayoutProps {
  children: ReactNode;
  className?: string;
  onDashboardClick?: () => void;
}

export const AdminLayout = ({ 
  children, 
  className = "",
  onDashboardClick 
}: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation onDashboardClick={onDashboardClick} />
      <div className="container flex w-full pt-24 pb-8">
        <main className={`flex-1 pl-4 ${className}`}>
          {children}
        </main>
      </div>
    </div>
  );
}; 