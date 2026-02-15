import { motion } from 'framer-motion';

interface LaserPointerProps {
  isAnimating: boolean;
}

/**
 * LaserPointer Component
 * Renders an animated laser beam pointer with energy particles and glow effects
 * Animates with bounce when the wheel lands on a reward
 */
export function LaserPointer({ isAnimating }: LaserPointerProps) {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
      <motion.div
        animate={isAnimating ? { scale: [1, 1.1, 1], opacity: [1, 0.8, 1] } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="relative"
      >
        {/* Laser beam */}
        <div className="w-[2px] h-[170px] bg-gradient-to-b from-transparent via-red-400 to-orange-200 shadow-[0_0_8px_rgba(255,0,0,0.8),0_0_16px_rgba(255,0,0,0.4)]" />
        
        {/* Beam glow effect */}
        <div className="absolute inset-0 w-[2px] h-[170px] bg-gradient-to-b from-transparent via-red-400 to-orange-400 blur-sm opacity-60" />
        
        {/* Energy particles */}
        <motion.div
          animate={isAnimating ? { y: [0, -10, 0] } : { y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute top-[20px] left-1/2 -translate-x-1/2 w-1 h-1 bg-yellow-300 rounded-full shadow-[0_0_4px_rgba(255,255,0,0.8)]"
        />
        <motion.div
          animate={isAnimating ? { y: [0, -15, 0] } : { y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          className="absolute top-[40px] left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-orange-300 rounded-full shadow-[0_0_3px_rgba(255,165,0,0.8)]"
        />
        
        {/* Laser tip glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full blur-md opacity-70" />
      </motion.div>
    </div>
  );
}
