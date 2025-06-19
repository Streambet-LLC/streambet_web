import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { api } from '@/integrations/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WalletDropdown } from './navigation/WalletDropdown';
import { UserDropdown } from './navigation/UserDropdown';
import { Home, Tv, Gift, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAnimations } from '@/hooks/useAnimations';

export const Navigation = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isScrolled, setIsScrolled] = useState(false);
  const [prevScrollY, setPrevScrollY] = useState(0);
  const [visible, setVisible] = useState(true);
  const { navVariants, buttonVariants } = useAnimations();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await api.auth.getSession();
      return data;
    },
  });
  const { data: profile } = useQuery({
    queryKey: ['profile', session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const data = await api.user.getProfile();
      return data;
    },
  });

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
  };

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
    { label: 'Home', icon: <Home size={18} />, path: '/' },
    { label: 'Streams', icon: <Tv size={18} />, path: '/' },
    { label: 'Rewards', icon: <Gift size={18} />, path: '/rewards' },
    { label: 'Community', icon: <Users size={18} />, path: '/community' },
  ];

  return (
    <motion.nav
      variants={navVariants}
      initial="visible"
      animate={visible ? 'visible' : 'hidden'}
      transition={{ duration: 0.3 }}
      className={`fixed top-0 w-full z-50 ${isScrolled ? 'bg-background/90 backdrop-blur-md shadow-md' : 'bg-background/60 backdrop-blur-sm'} transition-all duration-300`}
    >
      <div className="container flex h-16 items-center">
        <motion.div variants={logoVariants} initial="hidden" animate="visible">
          <Link to="/" className="flex items-center">
            <img src="./logo.png" alt="Streambet Logo" className="h-8 w-auto object-contain" />
          </Link>
        </motion.div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center ml-8 space-x-1">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.2, duration: 0.3 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Button>
            </motion.div>
          ))}
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
                <WalletDropdown walletBalance={profile?.wallet_balance || 0} />

                {profile?.data?.role === 'admin' && (
                  <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => navigate('/admin')}
                    >
                      Admin
                    </Button>
                  </motion.div>
                )}

                <UserDropdown profile={profile?.data} user={session} onLogout={handleLogout} />
              </>
            ) : (
              <>
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    Login
                  </Button>
                </motion.div>

                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    onClick={() => navigate('/signup')}
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
