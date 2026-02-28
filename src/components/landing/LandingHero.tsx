import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { publicAPI } from '@/integrations/api/client';

export default function LandingHero() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetch actual user count from API
    const fetchUserCount = async () => {
      try {
        const response = await publicAPI.getPlatformStats();
        if (response?.totalUsers) {
          setUserCount(response.totalUsers);
        }
      } catch (error) {
        // If fetch fails, fallback to a default
        console.log('Could not fetch user count, using fallback');
        setUserCount(1486); // Fallback value
      }
    };

    fetchUserCount();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
      <div className="text-center space-y-8">
        {/* Logo with glow effect */}
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.6 }}
          className="flex justify-center"
        >
          <motion.div
            className="relative inline-block"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-electric-lime to-creator-green blur-2xl opacity-40"
              animate={shouldReduceMotion ? undefined : { scale: [1, 1.2, 1] }}
              transition={shouldReduceMotion ? undefined : { duration: 3, repeat: Infinity }}
            />
            <img
              src="/wordmark.svg"
              alt="CardCade"
              className="relative h-16 md:h-24 w-auto object-contain"
            />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Your Friendly Marketplace for
            <span className="block bg-gradient-to-r from-electric-lime to-creator-green bg-clip-text text-transparent pb-2">
              Graded Trading Cards
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#FFFFFFBF] max-w-3xl mx-auto">
            Buy and sell slabs, earn rewards with every purchase and sale, and enjoy the lowest fees
            in the industry. Welcome to the future of card trading.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
        >
          <Button
            size="lg"
            onClick={() => navigate('/signup')}
            className="bg-gradient-to-r from-electric-lime to-creator-green hover:opacity-90 hover:from-electric-lime/90 hover:to-creator-green/90 text-black font-semibold px-8 py-6 text-lg group"
          >
            Get Started For Free
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.6, delay: 0.8 }}
          className="pt-8 text-sm text-[#FFFFFF80]"
        >
          {userCount !== null && (
            <p>
              Join{' '}
              <span className="text-electric-lime font-semibold">
                {userCount.toLocaleString()}+
              </span>{' '}
              collectors already trading on CardCade
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
