import { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';
import Sidebar from '../sidebar/Sidebar';
import { cn } from '@/lib/utils';

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
      <div className='w-full flex gap-2'>
        <Sidebar />
        <main className={cn("flex-1 flex flex-col h-[calc(100dvh-64px)] overflow-auto p-8 pb-8 ", className)}>
          {children}
        </main>
      </div>
      
    </div>
  );
};
