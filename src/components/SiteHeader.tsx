import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Gavel, Info, LogOut, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLogout } from '@/hooks/useLogout';
import { CollectIqLogoLink, SiteTabs } from './SiteTabs';

/** One width for every collectiqapp.xyz header, so the bar never shifts between tabs. */
export const SITE_HEADER_WIDTH = 'max-w-7xl';

/**
 * The collectiqapp.xyz top bar, shared by every main-site page (Hermes
 * Auctions, collectIQ Analytics, the dashboard, legal pages): logo, the two
 * tabs, an optional middle slot (the marketplace search), and the account
 * controls. `fixed` is for pages whose layout doesn't scroll itself (the
 * dashboard); it also renders the spacer under the bar.
 */
export function SiteHeader({ center, fixed }: { center?: ReactNode; fixed?: boolean }) {
  const { session, refetchSession } = useAuthContext();
  const { handleLogout } = useLogout();
  const location = useLocation();
  const redirect = encodeURIComponent(location.pathname + location.search);
  const pill = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold transition-colors sm:px-3',
      isActive ? 'bg-[#C7FA09] text-black' : 'text-white/70 hover:text-white'
    );

  const bar = (
    <header
      className={cn(
        'border-b border-white/10 bg-[#0a0a0a]/90 text-white backdrop-blur',
        fixed ? 'fixed inset-x-0 top-0 z-50' : 'sticky top-0 z-30'
      )}
    >
      <div className={`mx-auto flex h-16 ${SITE_HEADER_WIDTH} items-center gap-2 px-4 sm:gap-3`}>
        <CollectIqLogoLink />
        <SiteTabs className="sm:ml-2" />
        {center}
        <nav aria-label="Account" className="ml-auto flex items-center gap-1">
          <NavLink to="/about" className={pill} aria-label="About">
            <Info className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">About</span>
          </NavLink>
          {session ? (
            <>
              <NavLink to="/auctions/me" className={pill} aria-label="My bids">
                <Gavel className="h-4 w-4" />
                <span className="hidden sm:inline">My bids</span>
              </NavLink>
              <span className="ml-1 hidden items-center gap-1 text-xs text-white/50 lg:inline-flex">
                <UserRound className="h-3.5 w-3.5" />
                {session.username ?? session.user?.username}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await handleLogout();
                  refetchSession();
                }}
                aria-label="Log out"
                title="Log out"
                className="ml-1 rounded-full p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to={`/login?redirect=${redirect}`}
                aria-label="Log in"
                className="rounded-full px-2 py-1.5 text-sm font-semibold text-white/70 hover:text-white sm:px-3"
              >
                <UserRound className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Log in</span>
              </Link>
              <Link
                to={`/signup?redirect=${redirect}`}
                className="rounded-full bg-[#C7FA09] px-4 py-1.5 text-sm font-bold text-black hover:bg-[#d6ff3d]"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );

  return fixed ? (
    <>
      {bar}
      <div className="h-16 shrink-0" aria-hidden />
    </>
  ) : (
    bar
  );
}
