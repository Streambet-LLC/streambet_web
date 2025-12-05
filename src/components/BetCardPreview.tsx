import { BetCard as BetCardType } from '@/types/bet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getImageLink } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';
import { StreamStatus } from '@/enums';
import { StreamStatusBadge } from '@/components/stream/StreamStatusBadge';

export default function BetCardPreview(props: BetCardType) {
  const getThumbnailUrl = thumbnail => {
    if (!thumbnail) {
      return '/placeholder.svg';
    }

    // If it's already a full URL (starts with http or https), use it directly
    if (thumbnail.startsWith('http')) {
      return thumbnail;
    }

    // If it's a storage path from bucket but doesn't have the storage URL prefix
    if (
      thumbnail.includes('stream-thumbnails/') &&
      !thumbnail.includes(import.meta.env.VITE_SUPABASE_URL)
    ) {
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${thumbnail}`;
    }

    return getImageLink(thumbnail) || '/placeholder.svg';
  };

  return (
    <Card
      className={`h-full flex flex-col border border-gray-600 shadow-lg overflow-hidden`}
    >
      <CardHeader className="p-4 pb-0 flex flex-col gap-3">
        {props.streamStatus === StreamStatus.SCHEDULED && (
          <div className="flex justify-start">
            <StreamStatusBadge
              status={StreamStatus.SCHEDULED}
              scheduledStartTime={props.scheduledStartTime}
              multiline={false}
              isStreamType={props.type === 'stream'}
            />
          </div>
        )}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <img
              src={getThumbnailUrl(props.thumbnail)}
              className="aspect-square w-14 h-14 rounded-md object-cover"
            />
            <div className="flex items-center gap-2">
              <CardTitle
                className={cn('text-md line-clamp-2')}
              >
                {props.name}
              </CardTitle>
            </div>
          </div>
          {props.description && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild className="cursor-default">
                <CardDescription className="line-clamp-2 text-xs">
                  {props.description}
                </CardDescription>
              </TooltipTrigger>
              <TooltipContent className="w-60" side="bottom">
                {props.description}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 p-4">
        <div className="flex flex-col">
          {props.type === 'stream' && (
            <Link
              to={`#`}
              className="flex gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
            >
              <div className="py-[2px]">
                <Video className="h-4 w-4" />
              </div>
              {props.streamName}
            </Link>
          )}
          {props.creator && (
            <Link
              to={`#`}
              className="text-sm text-[#7AFF14] hover:text-foreground transition-colors"
            >
              {props.creator}
            </Link>
          )}
        </div>
        {props.options.slice(0, 2).map((option, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 flex gap-4 items-center justify-between transition-all px-2 py-1 rounded-md',
              'hover:bg-[#BDFF00] hover:text-black cursor-pointer',
            )}
          >
            <div
              className={cn(
                'text-sm rounded-full font-semibold',
              )}
            >
              {option.option}{' '}
            </div>
            <div className="text-lg font-semibold flex">{option.percentage}%</div>
          </div>
        ))}
        {props.options.length > 2 && (
          <div
            className={cn(
              'flex-1 flex gap-4 items-center justify-between transition-all px-2 py-1 rounded-md',
              'hover:bg-[#BDFF00] hover:text-black cursor-pointer',
            )}
          >
            <div className="text-sm rounded-full font-semibold">
              {props.options.length - 2} more...
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto"></CardFooter>
      <div className="p-6 pt-0">
        <div className="flex justify-between">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex gap-2 items-center text-gray-400 cursor-pointer">
                <div className="flex gap-2 text-sm items-center">
                  <img src="/icons/sweep-coins.png" alt="Stream Coins" className="h-3 w-5" />
                  100
                </div>
                <div className="flex gap-1 text-sm items-center">
                  <img src="/icons/gold-coins.png" alt="gold-coins" className="h-4 w-4" />
                  100
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Total Pot</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
