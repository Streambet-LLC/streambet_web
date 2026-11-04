import { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Gavel, UserRound } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Page chrome for Hermes Auctions. The rest of the site is collectIQ; only
 * auction pages carry the Hermes brand. The page scrolls itself because the
 * global CSS locks `body` scrolling.
 */
export function HermesShell({ children }: { children: ReactNode }) {
  const { session } = useAuthContext();
  const location = useLocation();
  const redirect = encodeURIComponent(location.pathname + location.search);
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-[#C7FA09] text-black' : 'text-white/70 hover:text-white'
    }`;

  return (
    <div className="relative h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/auctions" className="flex shrink-0 items-center" aria-label="Hermes Auctions home">
            <img
              src="/hermes/hermes-auctions-logo.png"
              alt="Hermes Auctions"
              className="hidden h-10 w-auto sm:block"
            />
            <img src="/hermes/hermes-mark-64.png" alt="Hermes Auctions" className="h-10 w-10 sm:hidden" />
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/auctions" end className={navClass}>
              Auctions
            </NavLink>
            {session ? (
              <NavLink to="/auctions/me" className={navClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Gavel className="h-4 w-4" /> My bids
                </span>
              </NavLink>
            ) : (
              <>
                <Link
                  to={`/login?redirect=${redirect}`}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/70 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  to={`/signup?redirect=${redirect}`}
                  className="rounded-full bg-[#C7FA09] px-4 py-1.5 text-sm font-bold text-black hover:bg-[#d6ff3d]"
                >
                  Sign up
                </Link>
              </>
            )}
            {session && (
              <span className="ml-1 hidden items-center gap-1 text-xs text-white/50 md:inline-flex">
                <UserRound className="h-3.5 w-3.5" />
                {session.username ?? session.user?.username}
              </span>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">{children}</main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/40">
        <p className="font-semibold uppercase tracking-[0.2em] text-[#C7FA09]/80">
          Zero-fee collectibles auctions
        </p>
        <p className="mt-2">
          No buyer premium. Pay by bank or USDC with no processing fee — cards add only the
          card processing cost.
        </p>
        <div className="mt-3 flex justify-center gap-4">
          <Link to="/" className="hover:text-white/70">
            collectIQ
          </Link>
          <Link to="/terms" className="hover:text-white/70">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-white/70">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Small "Hermes Auctions" eyebrow for sections outside the shell (landing page). */
export function HermesEyebrow({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#C7FA09] ${className}`}
    >
      <img src="/hermes/hermes-mark-32.png" alt="" className="h-5 w-5" />
      Hermes Auctions
    </span>
  );
}
