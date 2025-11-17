import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { getImageLink } from '@/utils/helper';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
  return (
    <Link to={`/stream/${streamId}`}>
      <TooltipProvider>
        <Tooltip delayDuration={0} disableHoverableContent={!compact}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'hover:bg-zinc-700 flex min-w-8 min-h-10 gap-2 justify-center items-center cursor-pointer py-1 rounded-md',
                compact ? 'px-1' : 'px-2'
              )}
            >
              <Avatar className="h-7 w-7 ">
                <AvatarImage src={getImageLink(pfp)} />
                <AvatarFallback>{creator[0].toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              {!compact && (
                <>
                  <div className="flex flex-col">
                    <div className="text-sm font-semibold text-[#7AFF14]">{creator}</div>
                    <div className="text-xs text-gray-400 line-clamp-1">{streamName}</div>
                  </div>
                  <div className="flex ml-auto items-center gap-1">
                    <img src="/blinking-dot.gif" className="min-w-4 h-4" />
                    {viewerCount > 0 && <div className="text-sm">{viewerCount}</div>}
                  </div>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className={cn('flex justify-between gap-4 items-center w-60', !compact && 'invisible')}
          >
            <div className="flex flex-col">
              <div className="text-sm font-semibold text-[#7AFF14]">{creator}</div>
              <div className="text-xs text-gray-400 line-clamp-1">{streamName}</div>
            </div>
            <div className="flex ml-auto items-center gap-1">
              <img src="blinking-dot.gif" className="w-4 h-4" />
              {viewerCount > 0 && <div className="text-sm">{viewerCount}</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Link>
  );
}
