import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WinnerAnimationProps {
  show: boolean;
  isWinner: boolean;
  isLoser: boolean;
  onClose?: () => void;
}

// Static confetti positions - generated once at module load
const CONFETTI_POSITIONS = Array.from({ length: 8 }, () => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
}));

// Static rain positions
const RAIN_POSITIONS = Array.from({ length: 12 }, () => Math.random() * 100);

export const WinnerAnimation = ({ show, isWinner, isLoser, onClose }: WinnerAnimationProps) => {
  // Guard against invalid states - prioritize winner if both are true
  const shouldShowWinner = show && isWinner;
  const shouldShowLoser = show && isLoser && !isWinner;

  const handleClose = () => {
    onClose?.();
  };

  return (
    <AnimatePresence>
      {shouldShowWinner && (
        <motion.div
          key="winner-animation"
          role="dialog"
          aria-modal="true"
          aria-labelledby="winner-message"
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Close animation"
          >
            <X className="h-6 w-6 text-white" />
          </Button>

          {/* Paper blast from left side */}
          <motion.div
            className="absolute left-0 top-1/2 transform -translate-y-1/2"
            initial={{ x: -100, rotate: -45 }}
            animate={{ x: 50, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.2,
            }}
          >
            <div className="w-16 h-20 bg-yellow-400 transform rotate-12 shadow-lg"></div>
            <div className="w-12 h-16 bg-blue-400 transform -rotate-6 shadow-lg mt-2"></div>
            <div className="w-14 h-18 bg-red-400 transform rotate-8 shadow-lg mt-1"></div>
          </motion.div>

          {/* Paper blast from right side */}
          <motion.div
            className="absolute right-0 top-1/2 transform -translate-y-1/2"
            initial={{ x: 100, rotate: 45 }}
            animate={{ x: -50, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.2,
            }}
          >
            <div className="w-16 h-20 bg-green-400 transform -rotate-12 shadow-lg"></div>
            <div className="w-12 h-16 bg-purple-400 transform rotate-6 shadow-lg mt-2"></div>
            <div className="w-14 h-18 bg-orange-400 transform -rotate-8 shadow-lg mt-1"></div>
          </motion.div>

          {/* Center congratulations text */}
          <motion.div
            id="winner-message"
            className="relative z-10 bg-gradient-to-r from-lime-400 to-green-500 text-black text-3xl font-bold px-10 py-6 rounded-xl shadow-xl"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: 0.1,
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            >
              🎉 Congratulations!! You are a winner! 🎉
            </motion.div>
          </motion.div>

          {/* Additional floating confetti */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {CONFETTI_POSITIONS.map((position, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                style={{
                  left: `${position.left}%`,
                  top: `${position.top}%`,
                }}
                initial={{ y: -20, opacity: 0 }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}

      {shouldShowLoser && (
        <motion.div
          key="loser-animation"
          role="dialog"
          aria-modal="true"
          aria-labelledby="loser-message"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center overflow-hidden p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          aria-label="Close animation"
        >
          <X className="h-6 w-6 text-white" />
        </Button>

        {/* Subtle raining lines to suggest a loss (mobile-friendly) */}
        <motion.div className="absolute inset-0 pointer-events-none">
          {RAIN_POSITIONS.map((left, i) => (
            <motion.div
              key={i}
              className="absolute w-[2px] h-6 sm:h-8 bg-blue-400/70 rounded-full"
              style={{ left: `${left}%`, top: -20 }}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: '120%', opacity: [0, 1, 0.3, 0] }}
              transition={{
                duration: 2 + (i % 4) * 0.2,
                repeat: Infinity,
                delay: i * 0.12,
                ease: 'easeIn',
              }}
            />
          ))}
        </motion.div>

        {/* Center message */}
        <motion.div
          id="loser-message"
          className="relative z-10 bg-zinc-900/80 backdrop-blur text-white text-xl sm:text-2xl md:text-3xl font-bold px-6 py-4 sm:px-8 sm:py-5 rounded-xl shadow-xl border border-zinc-700"
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          <motion.div
            className="leading-[80px]"
            animate={{ x: [0, -4, 4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            This pick didn't go your way 😕 <br />
            But the next one might be yours!
          </motion.div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
