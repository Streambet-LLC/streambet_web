import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLogout } from '@/hooks/useLogout';
import { LogOut } from 'lucide-react';

interface NavigationProps {
  onDashboardClick?: () => void;
  /** Retained for call-site compatibility; search is no longer in the nav. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

/**
 * Minimal top navigation for the private-beta build. The app is admin-only
 * behind the waitlist, so the nav is just the wordmark, admin links, and
 * login/logout — all marketplace/betting/wallet chrome has been removed.
 */
export const Navigation = ({ onDashboardClick }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, refetchSession } = useAuthContext();
  const { handleLogout } = useLogout();
  const isAdmin = session?.role === 'admin';

  const handleLogoutWithRefetch = async () => {
    await handleLogout();
    refetchSession();
  };

  const links = isAdmin ? [{ label: 'Analytics', path: '/analytics' }] : [];

  return (
    <>
      <nav className="fixed top-0 z-50 w-screen border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-electric-lime to-transparent opacity-50" />
        <div className="flex h-16 w-full items-center px-4">
          <Link to={isAdmin ? '/analytics' : '/'} className="flex items-center">
            <img
              src="/wordmark.svg"
              alt="CardCade"
              className="h-7 w-[120px] object-contain md:h-8 md:w-[165px]"
            />
          </Link>

          {links.length > 0 && (
            <div className="ml-3 flex items-center gap-1 md:ml-8">
              {links.map(item => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    className={`px-3 py-2 font-light ${
                      isActive
                        ? 'text-white'
                        : 'text-[#FFFFFF80] hover:text-white'
                    }`}
                    onClick={() => {
                      if (item.path === '/admin' && onDashboardClick) {
                        onDashboardClick();
                      }
                      navigate(item.path);
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
          )}

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
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>
      <div className="sticky top-0 h-16 w-full" />
    </>
  );
};
