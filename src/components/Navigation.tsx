import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WalletDropdown } from './navigation/WalletDropdown';
import { UserDropdown } from './navigation/UserDropdown';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAnimations } from '@/hooks/useAnimations';
import { api } from '@/integrations/api/client';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { CurrencyType } from '@/enums';
import { useLocationRestriction } from '@/contexts/LocationRestrictionContext';
import { useAuthContext } from '@/contexts/AuthContext';

interface NavigationProps {
  onDashboardClick?: () => void;
}

export const Navigation = ({ onDashboardClick }: NavigationProps) => {
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
  const isStreamCoins = currency === CurrencyType.STREAM_COINS;

  const { session, refetchSession } = useAuthContext();

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

  const handleLogout = async () => {
    await api.auth.signOut();
    queryClient.clear();
    navigate('/login');
    refetchSession();
  };

  useEffect(() => {
    if (!isCheckingLocation && session && !locationResult?.allowed) {
      handleLogout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingLocation, locationResult, session]);

  // Cleanup effect to restore body state when component unmounts
  useEffect(() => {
    return () => {
      // Restore body state if component unmounts while drawer is open
      const body = document.body;
      if (body.style.position === 'fixed') {
        const scrollY = body.style.top;
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.width = '';
        body.style.overflow = '';
        
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          (body.style as any).webkitOverflowScrolling = 'touch';
        }
      }
    };
  }, []);

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
    session?.role === 'admin' && { label: 'Dashboard', icon: undefined, path: '/admin' },
    { label: 'Home', icon: undefined, path: '/' },
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

  // Handle drawer open/close to prevent iOS scroll issues and click problems
  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);
    
    // Prevent background scrolling and blinking
    const body = document.body;
    
    if (open) {
      // Store current scroll position
      const scrollY = window.scrollY;
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      
      // On iOS, also handle webkit overflow scrolling
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        (body.style as any).webkitOverflowScrolling = 'auto';
      }
    } else {
      // Restore scroll position and body state
      const scrollY = body.style.top;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
      
      // On iOS, restore webkit overflow scrolling
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        (body.style as any).webkitOverflowScrolling = 'touch';
      }
    }
  };

  return (
    <motion.nav
      variants={navVariants}
      initial="visible"
      animate={visible ? 'visible' : 'hidden'}
      transition={{ duration: 0.3 }}
      className={`fixed top-0 w-full z-50 ${isScrolled ? 'bg-background/90 backdrop-blur-md shadow-md' : 'bg-background/60 backdrop-blur-sm'} transition-all duration-300`}
    >
      <div className="container flex h-16 items-center">
        {/* Mobile Menu Toggle */}
        <div className="md:hidden mr-3">
          <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="border-b">
                <DrawerTitle className="text-left">Menu</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 p-4">
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
                            handleLogout();
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
            </DrawerContent>
          </Drawer>
        </div>

        <motion.div variants={logoVariants} initial="hidden" animate="visible">
          <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="Streambet Logo" className="h-8 w-[165px] object-contain" />
          </Link>
        </motion.div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center ml-8 space-x-1">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.2, duration: 0.3 }}
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
            );
          })}
        </div>

        <div className="flex-1" />

        <AnimatePresence>
          <motion.div
            className="flex items-center space-x-2 md:space-x-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {session ? (
              <>
                <WalletDropdown walletBalance={isStreamCoins ? session?.walletBalanceCoin || 0 : session?.walletBalanceToken || 0} />

                <UserDropdown profile={session} onLogout={handleLogout} />
              </>
            ) : (
              <>
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const isStreamPage = location.pathname.startsWith('/stream/');
                    if (isStreamPage) {
                      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
                    } else {
                      navigate('/login');
                    }
                  }}>
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
                        navigate(`/signup?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
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
  );
};
