import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AnswerDepth, DEPTHS } from '@/hooks/useAnswerDepth';

/**
 * Answer-depth control — a compact segmented "effort" slider (Quick · Balanced
 * · Deep) styled after the Claude Code effort pill. Controls answer length and
 * how much live data Cardy pulls, for both the chat and deep dives.
 */
export const DepthSlider = ({
  value,
  onChange,
  disabled,
  className,
}: {
  value: AnswerDepth;
  onChange: (d: AnswerDepth) => void;
  disabled?: boolean;
  className?: string;
}) => {
  const idx = Math.max(
    0,
    DEPTHS.findIndex(d => d.key === value),
  );
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
        <Gauge className="h-3.5 w-3.5" /> Depth
      </span>
      <div
        role="radiogroup"
        aria-label="Answer depth"
        className={cn(
          'relative grid grid-cols-3 rounded-full border border-white/10 bg-black/40 p-0.5',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {/* Sliding lime thumb — one third wide, animates between stops. */}
        <span
          aria-hidden
          className="absolute inset-y-0.5 left-0.5 rounded-full bg-[#B4FF39] transition-transform duration-200 ease-out"
          style={{
            width: 'calc((100% - 0.25rem) / 3)',
            transform: `translateX(${idx * 100}%)`,
          }}
        />
        {DEPTHS.map(d => {
          const active = d.key === value;
          return (
            <button
              key={d.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(d.key)}
              title={d.hint}
              className={cn(
                'relative z-10 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                active ? 'text-black' : 'text-white/60 hover:text-white',
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
