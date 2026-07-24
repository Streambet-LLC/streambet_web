import { Settings2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { type AnswerDepth, DEPTHS } from '@/hooks/useAnswerDepth';

/**
 * Response-length settings — a gear button that opens a popover to pick how
 * much data Cardy pulls and how long answers run (Brief · Balanced · Deep).
 * Shared by the Cardy chat and the AI Market Reports panel.
 */
export const DepthSettings = ({
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
  const current = DEPTHS.find(d => d.key === value) ?? DEPTHS[1];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title="Response length"
          aria-label="Response length settings"
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-white disabled:opacity-50',
            className
          )}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            Response length:{' '}
            <span className="text-white/80">{current.label}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 border-white/10 bg-[rgba(20,20,20,1)] p-2 text-white"
      >
        <div className="px-1.5 pb-1.5 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          Response length
        </div>
        <div className="space-y-0.5">
          {DEPTHS.map(d => {
            const active = d.key === value;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => onChange(d.key)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                  active ? 'bg-[#B4FF39]/10' : 'hover:bg-white/5'
                )}
              >
                <Check
                  className={cn(
                    'mt-0.5 h-3.5 w-3.5 shrink-0',
                    active ? 'text-[#B4FF39]' : 'text-transparent'
                  )}
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-[13px] font-medium',
                      active ? 'text-white' : 'text-white/85'
                    )}
                  >
                    {d.label}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    {d.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
