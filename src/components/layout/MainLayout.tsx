import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  showFooter?: boolean;
  isWithdraw?: boolean;
  onDashboardClick?: () => void;
}

export const MainLayout = ({ 
  children, 
  className = "", 
  showFooter = true,
  isWithdraw = false,
  onDashboardClick 
}: MainLayoutProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (isWithdraw) {
    return (
		<div className="min-h-screen bg-black relative overflow-hidden">
      <Navigation onDashboardClick={onDashboardClick} />
			{/* Background gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
			
			{/* Subtle grid pattern */}
			<div className="absolute inset-0 opacity-5">
				<div className="absolute inset-0" style={{
					backgroundImage: `radial-gradient(circle at 1px 1px, rgba(189, 255, 0, 0.15) 1px, transparent 0)`,
					backgroundSize: '40px 40px'
				}}></div>
			</div>
			
			{/* Main Content */}
			<main className={`relative z-10 pt-20 ${className}`}>
				{children}
			</main>
		</div>
	);
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation onDashboardClick={onDashboardClick} />
      
      <main className={`container flex-1 pt-24 pb-8 ${className}`}>
        {children}
      </main>

      {showFooter && isHomePage && <Footer />}
    </div>
  );
}; 