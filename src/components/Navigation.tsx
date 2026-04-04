import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WalletDropdown } from './navigation/WalletDropdown';
import { UserDropdown } from './navigation/UserDropdown';
import { Menu, Mail, Crown, ShoppingCart } from 'lucide-react';
import { SearchInput } from './ui/SearchInput';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAnimations } from '@/hooks/useAnimations';
import { CustomDrawer } from './ui/CustomDrawer';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { CurrencyType } from '@/enums';
import { useLocationRestriction } from '@/contexts/LocationRestrictionContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLogout } from '@/hooks/useLogout';
import { useCookies } from 'react-cookie';
import moment from 'moment';
import { Separator } from './ui/separator';
import { api } from '@/integrations/api/client';
import { useCartCount } from '@/hooks/useCart';

interface NavigationProps {
  onDashboardClick?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

/** Cart icon button with badge for the navigation bar */
const CartNavButton = () => {
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const { data: cartCount } = useCartCount(!!session);
  const count = cartCount?.count || 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9"
      onClick={() => navigate('/cart')}
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
};

/** Cart badge for mobile drawer */
const CartMobileBadge = () => {
  const { session } = useAuthContext();
  const { data: cartCount } = useCartCount(!!session);
  const count = cartCount?.count || 0;

  if (count === 0) return null;

  return (
    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5">
      {count > 99 ? '99+' : count}
    </span>
  );
};

export const Navigation = ({ onDashboardClick, searchValue, onSearchChange }: NavigationProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const refLink = searchParams.get('ref');
  const promoCode = searchParams.get('promo-code');
  const [, setCookie] = useCookies(['referral-link', 'promo-code']);

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isScrolled, setIsScrolled] = useState(false);
  const [prevScrollY, setPrevScrollY] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { navVariants, buttonVariants } = useAnimations();
  const { locationResult, isCheckingLocation } = useLocationRestriction();
  const { currency } = useCurrencyContext();
  const isSweepCoins = currency === CurrencyType.SWEEP_COINS;

  const { session, refetchSession } = useAuthContext();
  const { handleLogout } = useLogout();
  const isPredictionsPage = location.pathname === '/predictions';

  // Inbox unread count polling (only when logged in)
  const { data: unreadData } = useQuery({
    queryKey: ['inbox-unread-count'],
    queryFn: () => api.inbox.getUnreadCount(),
    refetchInterval: 30000,
    enabled: !!session,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  // Handle scroll behavior for hiding/showing navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 10);

      // Hide navbar when scrolling down, show when scrolling up
      if (currentScrollY > prevScrollY + 20) {
        setVisible(false);
      } else if (currentScrollY < prevScrollY - 5) {
        setVisible(true);
      }

      setPrevScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollY]);

  const handleLogoutWithRefetch = async () => {
    await handleLogout();
    refetchSession();
  };

  useEffect(() => {
    if (!isCheckingLocation && session && !locationResult?.allowed) {
      handleLogoutWithRefetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingLocation, locationResult, session]);

  useEffect(() => {
    if (refLink) {
      if (refLink) {
        setCookie('referral-link', refLink, {
          expires: moment().add(1, 'day').toDate(),
        });
      }
    }
  }, [refLink]);

  useEffect(() => {
    if (promoCode) {
      if (promoCode) {
        setCookie('promo-code', promoCode, {
          expires: moment().add(1, 'day').toDate(),
        });
      }
    }
  }, [promoCode]);

  const logoVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.1,
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const menuItems = [
    { label: 'Shop', icon: undefined, path: '/' },
    { label: 'Redeem', icon: undefined, path: '/redemptions' },
    { label: 'Leaderboard', icon: undefined, path: '/leaderboard' },
    { label: 'Predictions', icon: undefined, path: '/predictions' },
    { label: 'How To Play', icon: undefined, path: '/how-to-play' },
    (session?.role === 'admin' || session?.role === 'creator') && {
      label: session?.role === 'admin' ? 'Admin Dashboard' : 'Creator Dashboard',
      path: session?.role === 'admin' ? '/admin' : '/creator',
    },
    // { label: 'Streams', icon: undefined, path: '/stream' },
    // { label: 'Rewards', icon: undefined, path: '/rewards' },
    // { label: 'Community', icon: undefined, path: '/community' },
  ].filter(Boolean);

  const handleMenuItemClick = (path: string) => {
    if (path === '/admin' && onDashboardClick) {
      onDashboardClick();
    }
    // Add a small delay to ensure the drawer is fully closed before navigation
    setTimeout(() => {
      navigate(path);
    }, 100);
    setIsDrawerOpen(false);
  };

  return (
    <>
      <motion.nav
        // variants={navVariants}
        // initial="visible"
        // animate="visible"
        // transition={{ duration: 0.3 }}
        className={`fixed top-0 w-screen z-50 border border-b ${isScrolled ? 'bg-background/90 backdrop-blur-md shadow-md' : 'bg-background/60 backdrop-blur-sm'} transition-all duration-300`}
      >
        {/* Gradient line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-electric-lime to-transparent opacity-50" />

        <div className="px-4 w-full flex h-16 items-center">
          {/* Mobile Menu Toggle */}
          {session && (
            <div className="md:hidden mr-3">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setIsDrawerOpen(true)}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <CustomDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                <div className="flex-1 overflow-y-auto p-4 pt-12">
                  {/* Logo for mobile */}
                  <div className="md:hidden mb-4 pl-4">
                    <Link
                      to="/"
                      className="flex items-center"
                      onClick={() => setIsDrawerOpen(false)}
                    >
                      <img
                        src="/wordmark.svg"
                        alt="CardCade Logo"
                        className="h-8 w-[165px] object-contain"
                      />
                    </Link>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {menuItems.map((item, index) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Button
                          key={item.label}
                          variant="ghost"
                          className={`justify-start text-left h-12 ${
                            isActive
                              ? 'text-white bg-primary/10'
                              : 'text-[#FFFFFF80] hover:text-white hover:bg-primary/5'
                          }`}
                          onClick={() => handleMenuItemClick(item.path)}
                        >
                          {item.icon}
                          <span className="ml-2">{item.label}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Add user actions at the bottom if logged in */}
                  {session && (
                    <div className="mt-8 pt-4 border-t">
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="ghost"
                          className="justify-start text-left h-12 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                          onClick={() => {
                            setTimeout(() => {
                              navigate('/settings?tab=pro');
                            }, 100);
                            setIsDrawerOpen(false);
                          }}
                        >
                          <Crown className="h-4 w-4 mr-2 fill-yellow-100 drop-shadow-[0_0_6px_rgba(253,224,71,0.6)]" />
                          <span>{session?.isProSubscriber ? 'Pro' : 'Get CardCade Pro'}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start text-left h-12 text-[#FFFFFF80] hover:text-white hover:bg-primary/5"
                          onClick={() => {
                            setTimeout(() => {
                              navigate('/cart');
                            }, 100);
                            setIsDrawerOpen(false);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          <span>Cart</span>
                          <CartMobileBadge />
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start text-left h-12 text-[#FFFFFF80] hover:text-white hover:bg-primary/5"
                          onClick={() => {
                            setTimeout(() => {
                              navigate('/inbox');
                            }, 100);
                            setIsDrawerOpen(false);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          <span>Inbox</span>
                          {unreadCount > 0 && (
                            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1.5">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start text-left h-12 text-[#FFFFFF80] hover:text-white hover:bg-primary/5"
                          onClick={() => {
                            setTimeout(() => {
                              navigate('/settings');
                            }, 100);
                            setIsDrawerOpen(false);
                          }}
                        >
                          <span>Settings</span>
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start text-left h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => {
                            setTimeout(() => {
                              handleLogoutWithRefetch();
                            }, 100);
                            setIsDrawerOpen(false);
                          }}
                        >
                          <span>Logout</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CustomDrawer>
            </div>
          )}

          {/* Left Column: Logo + Menu */}
          <div className="hidden md:flex items-center">
            <motion.div>
              <Link to="/" className="flex items-center">
                <img
                  src="/wordmark.svg"
                  alt="CardCade Logo"
                  className="h-8 w-[165px] object-contain"
                />
              </Link>
            </motion.div>

            {/* Desktop Menu */}
            {session && (
              <div className="hidden md:flex items-center ml-8 space-x-1">
                {menuItems.map((item, index) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <>
                      {(item.path === '/admin' || item.path === '/creator') && (
                        <span className="text-primary/60">|</span>
                      )}
                      <motion.div
                        key={item.label}
                        // initial={{ opacity: 0, y: -10 }}
                        // animate={{ opacity: 1, y: 0 }}
                        // transition={{ delay: index * 0.05 + 0.2, duration: 0.3 }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-2 font-light transition-colors px-3 py-2 ${
                            isActive
                              ? 'text-white'
                              : 'text-[#FFFFFF80] hover:text-primary-foreground'
                          }`}
                          onClick={() => handleMenuItemClick(item.path)}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Button>
                      </motion.div>
                    </>
                  );
                })}
              </div>
            )}
          </div>

          {/* Center Column: Search Bar - Only on Predictions Page */}
          <div className="hidden md:flex flex-1 justify-center mx-4">
            {session && isPredictionsPage && searchValue !== undefined && onSearchChange && (
              <div className="max-w-[280px] md:max-w-lg w-full">
                <SearchInput
                  id="nav-search"
                  value={searchValue}
                  onChange={onSearchChange}
                  width="full"
                  placeholder="Search Picks, creators, streams..."
                  className="border-primary/60 shadow-[0_0_8px_rgba(189,255,0,0.3)]"
                />
              </div>
            )}
          </div>

          {/* Right Column: User Actions */}
          <AnimatePresence>
            <motion.div
              className="flex items-center space-x-2 md:space-x-4 ml-auto"
              // initial={{ opacity: 0, scale: 0.9 }}
              // animate={{ opacity: 1, scale: 1 }}
              // transition={{ duration: 0.3 }}
            >
              {session ? (
                <>
                  {session?.isProSubscriber ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden md:inline-flex h-9 w-9 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                      onClick={() => navigate('/settings?tab=pro')}
                    >
                      <Crown className="h-4.5 w-4.5 fill-yellow-100 drop-shadow-[0_0_6px_rgba(253,224,71,0.6)]" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden md:inline-flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 px-3 py-2 font-medium"
                      onClick={() => navigate('/settings?tab=pro')}
                    >
                      <Crown className="h-4 w-4 fill-yellow-100" />
                      <span className="text-sm">Get CardCade Pro</span>
                    </Button>
                  )}

                  <WalletDropdown walletBalance={session?.walletBalanceCadeCoin || 0} />

                  <CartNavButton />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                    onClick={() => navigate('/inbox')}
                  >
                    <Mail className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>

                  <UserDropdown profile={session} onLogout={handleLogoutWithRefetch} />
                </>
              ) : (
                <>
                  <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const isStreamPage = location.pathname.startsWith('/stream/');
                        if (isStreamPage) {
                          navigate(
                            `/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`
                          );
                        } else {
                          navigate('/login');
                        }
                      }}
                    >
                      Login
                    </Button>
                  </motion.div>

                  <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      onClick={() => {
                        const isStreamPage = location.pathname.startsWith('/stream/');
                        if (isStreamPage) {
                          navigate(
                            `/signup?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`
                          );
                        } else {
                          navigate('/signup');
                        }
                      }}
                    >
                      Sign Up
                    </Button>
                  </motion.div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.nav>
      <div className="sticky top-0 w-full h-16" />
    </>
  );
};
