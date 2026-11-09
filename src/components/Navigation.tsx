import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLogout } from '@/hooks/useLogout';
import { LogOut } from 'lucide-react';
import { CollectIqLogoLink, SiteTabs } from './SiteTabs';

interface NavigationProps {
  /** Retained for call-site compatibility; unused since the tabs replaced admin links. */
  onDashboardClick?: () => void;
  /** Retained for call-site compatibility; search is no longer in the nav. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

/**
 * collectiqapp.xyz top bar for the analytics side (dashboard, deep dives,
 * legal pages): the wordmark, the two site tabs (Hermes Auctions,
 * collectIQ Analytics), and log in / log out.
 */
export const Navigation = (_props: NavigationProps) => {
  const navigate = useNavigate();
  const { session, refetchSession } = useAuthContext();
  const { handleLogout } = useLogout();

  const handleLogoutWithRefetch = async () => {
    await handleLogout();
    refetchSession();
  };

  return (
    <>
      <nav className="fixed top-0 z-50 w-screen border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-electric-lime to-transparent opacity-50" />
        <div className="flex h-16 w-full items-center gap-2 px-4 sm:gap-3">
          <CollectIqLogoLink />
          <SiteTabs className="sm:ml-2 md:ml-6" />

          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={handleLogoutWithRefetch}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Log in
              </Button>
            )}
          </div>
        </div>
      </nav>
      <div className="sticky top-0 h-16 w-full" />
    </>
  );
};
