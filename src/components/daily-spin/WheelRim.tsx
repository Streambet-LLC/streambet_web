import { cn } from '@/lib/utils';
import { RIM_NEON_COLORS } from './daily-spin-constants';

/**
 * WheelRim Component
 * Renders the decorative outer rim with neon lights and glow effects
 */
export function WheelRim() {
  return (
    <>
      {/* Outer rim border */}
      <div className={cn(
        "absolute inset-[8px] rounded-full",
        "border-4 border-cyan-400/70 shadow-[inset_0_0_0_4px_rgba(0,255,255,0.2),inset_0_0_0_8px_rgba(255,0,255,0.1)]"
      )} />

      {/* Rim decorations - Neon lights */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (360 / 16) * i;
        const color = RIM_NEON_COLORS[i % RIM_NEON_COLORS.length];
        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full shadow-lg"
            style={{
              backgroundColor: color,
              top: '8px',
              left: '50%',
              transform: `translateX(-50%) rotate(${angle}deg) translateY(-50%)`,
              boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
            }}
          />
        );
      })}

      {/* Rim glow */}
      <div className="absolute inset-[2px] rounded-full pointer-events-none shadow-[inset_0_0_40px_rgba(255,255,255,0.08)]" />
    </>
  );
}
