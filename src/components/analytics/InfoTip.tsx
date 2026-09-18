import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Side = 'top' | 'bottom' | 'left' | 'right';

/**
 * A small info icon that reveals a plain-language explanation on hover/focus.
 * Used across the Analytics surface to explain data types, metrics, and views.
 * Stops click propagation so it never triggers a surrounding row/tab handler.
 */
export const InfoTip = ({
  children,
  className,
  side = 'top',
}: {
  children: ReactNode;
  className?: string;
  side?: Side;
}) => (
  <Tooltip delayDuration={150}>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        aria-label="More info"
        className={cn(
          'inline-flex shrink-0 items-center align-middle text-white/30 transition-colors hover:text-white/70',
          className,
        )}
      >
        <Info className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent
      side={side}
      className="max-w-[260px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85"
    >
      {children}
    </TooltipContent>
  </Tooltip>
);

/**
 * Wraps an existing bit of text (a metric name, a value) so hovering it reveals
 * an explanation — with a subtle dotted underline to hint it's hoverable. No
 * extra icon, so it stays clean when repeated across many rows.
 */
export const TermTip = ({
  children,
  tip,
  className,
  side = 'top',
}: {
  children: ReactNode;
  tip: ReactNode;
  className?: string;
  side?: Side;
}) => (
  <Tooltip delayDuration={150}>
    <TooltipTrigger asChild>
      <span
        onClick={e => e.stopPropagation()}
        className={cn(
          'cursor-help underline decoration-dotted decoration-white/25 underline-offset-2',
          className,
        )}
      >
        {children}
      </span>
    </TooltipTrigger>
    <TooltipContent
      side={side}
      className="max-w-[260px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85"
    >
      {tip}
    </TooltipContent>
  </Tooltip>
);

/** A text label with a trailing info tip. */
export const HelpLabel = ({
  label,
  children,
  className,
  side,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  side?: Side;
}) => (
  <span className={cn('inline-flex items-center gap-1', className)}>
    {label}
    <InfoTip side={side}>{children}</InfoTip>
  </span>
);
