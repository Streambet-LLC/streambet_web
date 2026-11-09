import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Gavel, Info, Search, UserRound, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { SiteHeader } from '@/components/SiteHeader';
import { useBuyerFeeRates } from './useHermesConfig';
import { HERMES_HOME, IS_HERMES_SITE } from './site';
import { NICK_EMAIL } from '@/lib/contact';

/**
 * The buyer-fee terms, shared by the marketplace hero and the footer
 * (Aaron's wording, 2026-11-09). Rates come from the API config.
 */
export function BuyerFeeTerms() {
  const r = useBuyerFeeRates();
  return (
    <>
      Winners pay a variable buyer fee based on the payment tender used — {r.card}% for credit card,{' '}
      {r.ach}% for ACH, and {r.usdc}% for USDC. Every lot is hosted and shipped by Hermes Auctions.
      All bids are final.
    </>
  );
}

/**
 * Page chrome for Hermes Auctions: on the main site the rest is collectIQ and
 * only auction pages carry the Hermes brand; on the standalone Hermes site
 * (its own domain) this is the whole site. The page scrolls itself because
 * the global CSS locks `body` scrolling.
 */
export function HermesShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { session } = useAuthContext();
  const location = useLocation();
  const redirect = encodeURIComponent(location.pathname + location.search);
  const container = wide ? 'max-w-7xl' : 'max-w-6xl';
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-[#C7FA09] text-black' : 'text-white/70 hover:text-white'
    }`;

  // collectiqapp.xyz uses the shared top bar (identical on every tab); the
  // dormant standalone Hermes site keeps its own Hermes-branded one.
  const standaloneHeader = (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur">
      <div className={`mx-auto flex h-16 ${container} items-center gap-2 px-4 sm:gap-3`}>
        <Link
          to={HERMES_HOME}
          className="flex shrink-0 items-center"
          aria-label="Hermes Auctions home"
        >
          <img
            src="/hermes/hermes-auctions-logo.png"
            alt="Hermes Auctions"
            className="hidden h-10 w-auto sm:block"
          />
          <img
            src="/hermes/hermes-mark-64.png"
            alt="Hermes Auctions"
            className="h-10 w-10 sm:hidden"
          />
        </Link>
        <MarketSearch className="mx-2 hidden max-w-md flex-1 md:flex" />
        <nav className="ml-auto flex items-center gap-1">
          <NavLink to={HERMES_HOME} end className={navClass}>
            Auctions
          </NavLink>
          <NavLink to="/about" className={navClass} aria-label="About">
            <Info className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">About</span>
          </NavLink>
          {session ? (
            <NavLink to="/auctions/me" className={navClass} aria-label="My bids">
              <span className="inline-flex items-center gap-1.5">
                <Gavel className="h-4 w-4" />
                <span className="hidden sm:inline">My bids</span>
              </span>
            </NavLink>
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
          {session && (
            <span className="ml-1 hidden items-center gap-1 text-xs text-white/50 lg:inline-flex">
              <UserRound className="h-3.5 w-3.5" />
              {session.username ?? session.user?.username}
            </span>
          )}
        </nav>
      </div>
    </header>
  );

  return (
    // Flex column + flex-1 main: the footer sits at the bottom on short pages.
    <div className="relative flex h-[100dvh] flex-col overflow-y-auto overflow-x-hidden bg-[#0a0a0a] text-white">
      {IS_HERMES_SITE ? (
        standaloneHeader
      ) : (
        <SiteHeader center={<MarketSearch className="mx-2 hidden max-w-md flex-1 lg:flex" />} />
      )}

      <main className={`mx-auto w-full flex-1 ${container} px-4 pb-20 pt-6`}>{children}</main>

      <footer className="shrink-0 border-t border-white/10 py-8 text-center text-xs text-white/40">
        <p className="font-semibold uppercase tracking-[0.2em] text-[#C7FA09]/80">
          Zero-seller-fee collectibles auctions
        </p>
        <p className="mx-auto mt-2 max-w-3xl px-4">
          <BuyerFeeTerms />
        </p>
        <p className="mx-auto mt-3 max-w-3xl px-4 text-sm text-white/65">
          If you'd like to consign with us, feel free to reach out to{' '}
          <a
            href={`mailto:${NICK_EMAIL}?subject=${encodeURIComponent('Consigning with Hermes Auctions')}`}
            className="font-semibold text-[#C7FA09] underline-offset-2 hover:underline"
          >
            {NICK_EMAIL}
          </a>
          !
        </p>
        <div className="mt-3 flex justify-center gap-4">
          {IS_HERMES_SITE ? (
            <span>© Hermes Auctions {new Date().getFullYear()}</span>
          ) : (
            <Link to="/analytics" className="hover:text-white/70">
              collectIQ Analytics
            </Link>
          )}
          <Link to="/about" className="hover:text-white/70">
            About
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

/**
 * Marketplace search box. On the marketplace it filters as you type (the
 * query lives in `?q=`, so results are linkable); anywhere else, submitting
 * opens the marketplace with the query.
 */
export function MarketSearch({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const onHome = location.pathname === HERMES_HOME;
  const urlQ = onHome ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(urlQ);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) setValue(urlQ);
  }, [urlQ]);

  const go = (q: string, replace: boolean) => {
    const next = new URLSearchParams(onHome ? params : undefined);
    if (q) next.set('q', q);
    else next.delete('q');
    const search = next.toString();
    navigate({ pathname: HERMES_HOME, search: search ? `?${search}` : '' }, { replace });
  };

  // Live filtering on the marketplace, debounced.
  useEffect(() => {
    if (!onHome || !typed.current) return;
    const q = value.trim();
    if (q === urlQ) return;
    const t = setTimeout(() => go(q, true), 350);
    return () => clearTimeout(t);
    // `go` reads the latest params; re-running on them would re-fire the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onHome, urlQ]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    typed.current = false;
    go(value.trim(), onHome);
  };

  return (
    <form role="search" onSubmit={submit} className={`relative items-center ${className}`}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/40" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={e => {
          typed.current = true;
          setValue(e.target.value);
        }}
        onBlur={() => {
          typed.current = false;
        }}
        placeholder="Search cards, players, sets…"
        aria-label="Search auctions"
        enterKeyHint="search"
        className="h-10 w-full rounded-full border border-white/10 bg-white/[0.06] pl-9 pr-9 text-sm text-white placeholder:text-white/40 focus:border-[#C7FA09]/60 focus:outline-none focus:ring-2 focus:ring-[#C7FA09]/25 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            typed.current = false;
            setValue('');
            if (urlQ) go('', true);
          }}
          className="absolute right-2 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
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
