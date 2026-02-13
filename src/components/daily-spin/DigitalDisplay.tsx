import { motion } from 'framer-motion';
import { CURRENCY_NAME } from './daily-spin-constants';

interface DigitalDisplayProps {
  value: number;
  isVisible: boolean;
}

/**
 * DigitalDisplay Component
 * LCD-style display that shows the reward amount after a spin
 * Animates in with fade and scale effects
 */
export function DigitalDisplay({ value, isVisible }: DigitalDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 20,
        scale: isVisible ? 1 : 0.95
      }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-[380px]"
    >
      {/* LCD Screen */}
      <div className="bg-black border-2 border-green-400 rounded-lg p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(0,0,0,0.3)]">
        {/* Screen content */}
        <div className="text-center space-y-2">
          {/* Header */}
          <div className="text-xs font-mono text-green-400 tracking-widest crt-glow-subtle">
            YOU WON
          </div>

          {/* Amount */}
          <div className="text-3xl md:text-4xl font-mono font-black text-green-300 crt-glow-strong">
            {value.toLocaleString()}
          </div>

          {/* Currency */}
          <div className="text-sm font-mono text-green-500 tracking-wide crt-glow-medium">
            {CURRENCY_NAME}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
