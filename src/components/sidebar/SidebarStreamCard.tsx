import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { getImageLink } from '@/utils/helper';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

export default function SidebarStreamCard({
  compact,
  pfp,
  viewerCount,
  streamName,
  streamId,
  creator,
}: {
  compact: boolean;
  pfp: string;
  viewerCount: number;
  streamName: string;
  streamId: string;
  creator: string;
}) {
  const isHot = viewerCount > 10; // Consider streams with 10+ viewers as "hot"

  return (
    <Link to={`/stream/${streamId}`}>
      <TooltipProvider>
        <Tooltip delayDuration={0} disableHoverableContent={!compact}>
          <TooltipTrigger asChild>
            <motion.div
              className={cn(
                'relative transition-all cursor-pointer group',
                compact 
                  ? 'p-1 rounded-md hover:bg-sidebar-compact-hover' 
                  : 'p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-sidebar-card-border hover:border-primary/30 hover:bg-primary/5'
              )}
              whileHover={compact ? {} : { x: 4 }}
            >
              {compact ? (
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-primary/50 group-hover:border-primary">
                    <AvatarImage src={getImageLink(pfp)} />
                    <AvatarFallback>{creator[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  {/* Pulsing Live Dot */}
                  <motion.div
                    className="absolute -top-0.5 -right-0.5 size-3 bg-red-500 rounded-full border-2 border-background"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  {/* Avatar with Live Indicator */}
                  <div className="relative shrink-0">
                    <Avatar className="size-[40px] border-2 border-primary/50 group-hover:border-primary">
                      <AvatarImage src={getImageLink(pfp)} />
                      <AvatarFallback>{creator[0]?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    {/* Pulsing Live Dot */}
                    <motion.div
                      className="absolute -top-0.5 -right-0.5 size-3 bg-red-500 rounded-full border-2 border-background"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>

                  {/* Creator Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[13px] font-semibold text-white truncate group-hover:text-primary transition-colors">
                        {creator}
                      </p>
                      {isHot && (
                        <Flame className="size-3 text-live-hot shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground truncate">{streamName}</span>
                      {viewerCount > 0 && (
                        <span className="text-[11px] text-primary font-semibold shrink-0">
                          {viewerCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className={cn('p-2.5 bg-sidebar-card-bg border border-sidebar-card-border', !compact && 'invisible')}
          >
            <div className="flex items-center gap-2.5 min-w-[200px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-[13px] font-semibold text-white truncate">
                    {creator}
                  </p>
                  {isHot && (
                    <Flame className="size-3 text-live-hot shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground truncate">{streamName}</span>
                  {viewerCount > 0 && (
                    <span className="text-[11px] text-primary font-semibold shrink-0">
                      {viewerCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Link>
  );
}
