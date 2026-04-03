import { Crown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ProBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const ProBadge = ({ className, size = 'sm', showTooltip = true }: ProBadgeProps) => {
  const badge = (
    <span className={cn('inline-flex items-center justify-center', className)}>
      <Crown
        className={cn(
          sizeClasses[size],
          'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.4)]'
        )}
      />
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-gradient-to-r from-yellow-900/90 to-yellow-800/90 border-yellow-600/50 text-yellow-100"
        >
          <p className="text-xs font-medium">CardCade Pro Member</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
