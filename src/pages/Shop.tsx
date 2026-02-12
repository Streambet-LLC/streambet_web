import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShoppingBag, Gift, Star, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  rotation: number;
}

const Shop = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [isClicked, setIsClicked] = useState(false);
  const [notified, setNotified] = useState(false);
  const nextIdRef = useRef(0);
  const navigate = useNavigate();

  const emojis = ['🛍️', '🎁', '✨', '🎉', '💎', '🏆', '⚡', '🌟', '🔥', '💫'];

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newParticle: Particle = {
      id: nextIdRef.current++,
      x,
      y,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      rotation: Math.random() * 360,
    };

    setParticles(prev => [...prev, newParticle]);
    setClickCount(prev => prev + 1);

    // Trigger click animation
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);

    // Remove particle after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 2000);
  };

  useEffect(() => {
    // Auto-spawn particles periodically
    const interval = setInterval(() => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;

      const autoParticle: Particle = {
        id: nextIdRef.current++,
        x,
        y,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        rotation: Math.random() * 360,
      };

      setParticles(prev => [...prev, autoParticle]);

      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== autoParticle.id));
      }, 2000);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const getEncouragingMessage = () => {
    if (clickCount < 10) return 'Keep clicking! 🎉';
    if (clickCount < 25) return "You're on fire! 🔥";
    if (clickCount < 50) return 'Amazing! 💎';
    if (clickCount < 100) return 'Unstoppable! 🏆';
    return 'Legendary! 🌟';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1E] via-[#1A1F2E] to-[#0A0F1E] relative">
      {/* Logo in top left */}
      <div className="fixed top-4 left-4 z-50">
        <Link to="/" className="flex items-center">
          <img src="/wordmark.svg" alt="Streambet Logo" className="h-8 w-[165px] object-contain" />
        </Link>
      </div>

      {/* Background animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-electric-lime/10 rounded-full blur-3xl"
          animate={{
            x: ['-25%', '125%'],
            y: ['-25%', '50%', '-25%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: ['125%', '-25%'],
            y: ['125%', '25%', '125%'],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Particles */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute text-4xl pointer-events-none z-10"
            initial={{
              x: particle.x,
              y: particle.y,
              scale: 0,
              rotate: particle.rotation,
              opacity: 1,
            }}
            animate={{
              y: particle.y - 200,
              scale: [0, 1.5, 1],
              rotate: particle.rotation + 360,
              opacity: [1, 1, 0],
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: 2,
              ease: 'easeOut',
            }}
          >
            {particle.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center min-h-screen px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4 md:space-y-8 w-full max-w-6xl my-auto"
        >
          {/* Icon */}
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            whileHover={{
              scale: 1.15,
              rotate: [0, -5, 5, -5, 0],
              transition: { duration: 0.5 },
            }}
            className="flex justify-center cursor-pointer select-none touch-none"
            onClick={handleClick}
            onTouchStart={e => {
              e.stopPropagation();
            }}
          >
            <motion.div
              className="relative"
              animate={isClicked ? { scale: [1, 0.85, 1.1, 1], rotate: [0, -15, 15, 0] } : {}}
              transition={{ duration: 0.3 }}
            >
              <ShoppingBag
                className="w-24 h-24 md:w-32 md:h-32 text-electric-lime"
                strokeWidth={1.5}
              />
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Title */}
          <div className="space-y-2 md:space-y-4">
            <motion.h1
              className="text-5xl md:text-8xl font-bold text-white"
              animate={{
                textShadow: [
                  '0 0 20px rgba(190, 242, 2, 0.5)',
                  '0 0 40px rgba(190, 242, 2, 0.8)',
                  '0 0 20px rgba(190, 242, 2, 0.5)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              Coming Soon
            </motion.h1>

            <p className="text-base md:text-2xl text-gray-400 max-w-2xl mx-auto">
              Get ready for an amazing shopping experience! <br className="hidden md:block" />
              <span className="text-electric-lime">Tap the icon to celebrate! 🎉</span>
            </p>
          </div>

          {/* Click counter */}
          <motion.div
            className="bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 md:px-8 md:py-4 border border-electric-lime/20"
            animate={{
              scale: clickCount > 0 ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <p className="text-white text-lg">
              Clicks: <span className="text-electric-lime font-bold">{clickCount}</span>
            </p>
            {clickCount > 5 && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-gray-400 mt-1"
              >
                {getEncouragingMessage()}
              </motion.p>
            )}
          </motion.div>

          {/* Features preview */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
            {[
              {
                icon: Gift,
                title: 'Exclusive Items',
                desc: 'Limited edition cards and collectibles',
              },
              {
                icon: Star,
                title: 'Spend CadeCoins',
                desc: 'Earn and spend CadeCoins towards purchases',
              },
              {
                icon: Sparkles,
                title: 'Special Deals',
                desc: 'Partner discounts with special promotions',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-electric-lime/50 transition-colors"
              >
                <feature.icon className="w-10 h-10 text-electric-lime mb-3 mx-auto" />
                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="pt-4 md:pt-8 flex flex-row gap-2 md:gap-4 items-center justify-center"
          >
            <Button
              size="lg"
              variant="outline"
              className="border-electric-lime/50 hover:bg-electric-lime hover:text-black hover:scale-105 hover:shadow-2xl hover:shadow-electric-lime/40 text-electric-lime font-bold px-4 py-4 md:px-8 md:py-6 text-sm md:text-lg rounded-full pointer-events-auto transition-all duration-300"
              onClick={e => {
                e.stopPropagation();
                navigate(-1);
              }}
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
              <span>Go Back</span>
            </Button>
            <Button
              size="lg"
              disabled={notified}
              className="bg-electric-lime hover:bg-black hover:text-electric-lime hover:scale-105 hover:shadow-2xl hover:shadow-electric-lime/40 text-black font-bold px-4 py-4 md:px-8 md:py-6 text-sm md:text-lg rounded-full shadow-xl shadow-electric-lime/20 pointer-events-auto transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-electric-lime"
              onClick={e => {
                e.stopPropagation();
                if (!notified) {
                  setNotified(true);
                  alert("Stay tuned! We'll notify you when the shop launches! 🚀");
                }
              }}
            >
              <span className="md:mr-2">{notified ? 'Notified!' : 'Notify Me'}</span>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 hidden md:inline" />
            </Button>
          </motion.div>

          {/* Easter egg hint */}
          {clickCount > 50 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-500 mt-8"
            >
              🎮 Achievement Unlocked: Shop Explorer! Keep an eye out for launch day!
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Corner decoration */}
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-electric-lime/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default Shop;
