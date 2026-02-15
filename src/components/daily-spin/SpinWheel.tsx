import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPIN_ANIMATION_DURATION } from './daily-spin-constants';
import { WheelSegments } from './WheelSegments';
import { LaserPointer } from './LaserPointer';
import { WheelRim } from './WheelRim';
import { WheelHub } from './WheelHub';
import { DigitalDisplay } from './DigitalDisplay';
import { useWheelRotation } from './hooks/useWheelRotation';
import { useRewardDisplay } from './hooks/useRewardDisplay';

interface SpinWheelProps {
  onSpin: () => void;
  isSpinning: boolean;
  canSpin: boolean;
  reward?: number;
  disabled?: boolean;
  disabledButtonText?: string;
  resetTimeText?: string;
}

export function SpinWheel({ onSpin, isSpinning, canSpin, reward, disabled, disabledButtonText, resetTimeText }: SpinWheelProps) {
  const prefersReducedMotion = useReducedMotion();

  // Fallback to 0 if reward is undefined
  const animatedReward = reward ?? 0;

  // Manage wheel rotation with custom hook
  const rotation = useWheelRotation(reward, isSpinning, prefersReducedMotion);

  // Manage reward display timing
  const showReward = useRewardDisplay(reward, isSpinning);

  const handleSpin = () => {
    onSpin();
  };

  // Pointer bounce timing (only bounce when spin ends on a known reward)
  const pointerBump = !prefersReducedMotion && reward && !isSpinning;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Gradient separator line */}
      <div className="w-full max-w-[340px] h-px crt-line-glow" 
           style={{ background: 'linear-gradient(to right, transparent, var(--electric-lime), transparent)' }} />
      
      <div className={cn(
        "relative w-full aspect-square max-w-[340px]",
        "crt-screen"
      )}>
        {/* Neon glow effects */}
        <>
          <div className="absolute inset-0 rounded-full bg-gradient-radial from-pink-500/20 via-cyan-500/10 to-transparent blur-xl" />
          <div className="absolute inset-2 rounded-full bg-gradient-radial from-magenta-500/15 via-blue-500/8 to-transparent blur-lg" />
        </>
        
        {/* Laser Beam Pointer */}
        <LaserPointer isAnimating={pointerBump} />

        {/* Rim + wheel */}
        <div className={cn(
          "absolute inset-0 rounded-full p-[12px]",
          "bg-gradient-to-br from-purple-900/80 via-pink-900/60 to-cyan-900/80 shadow-[0_24px_70px_rgba(255,0,255,0.3)] border-4 border-pink-500/50"
        )}>
          {/* Outer rim with neon lights */}
          <WheelRim />

          {/* Mechanical wheel */}
          <motion.div
            className="relative w-full h-full rounded-full overflow-hidden border-4 border-gray-500 shadow-[inset_0_0_0_4px_rgba(0,0,0,0.6),inset_0_0_0_8px_rgba(255,255,255,0.1)]"
            animate={{ rotate: rotation }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: SPIN_ANIMATION_DURATION / 1000, ease: [0.12, 0.86, 0.18, 0.98] }
            }
          >
            {/* Wheel segments with coin amounts and probabilities */}
            <WheelSegments />

            {/* Mechanical center hub */}
            <WheelHub />
          </motion.div>
        </div>
      </div>
      
      <Button
        onClick={handleSpin}
        disabled={!canSpin || isSpinning || disabled}
        size="lg"
        className={cn(
          "w-full md:max-w-[340px] h-14 text-sm md:text-lg font-bold font-mono uppercase tracking-wider",
          'bg-bet-option-bg border border-primary text-white shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_0_0_2px_rgba(34,197,94,0.6)]',
          'hover:text-black hover:shadow-[0_0_20px_rgba(189,255,0,0.4)] cursor-pointer',
          'shadow-[0_4px_8px_rgba(0,0,0,0.3)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]'
        )}
      >
        {isSpinning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            PROCESSING...
          </>
        ) : !canSpin && disabledButtonText ? (
          <>{disabledButtonText}</>
        ) : (
          <>SPIN WHEEL</>
        )}
      </Button>

      {/* Reset Time Info */}
      {resetTimeText && (
        <div className="text-center text-xs text-gray-500 font-mono tracking-wide mt-2">
          {resetTimeText}
        </div>
      )}

      {/* Digital LCD Display - Prize Amount */}
      <DigitalDisplay value={animatedReward} isVisible={showReward && !!reward} />
    </div>
  );
}
