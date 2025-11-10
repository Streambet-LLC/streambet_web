import { BetCard as BetCardType } from '@/types/bet';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getImageLink } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';
import { useState } from 'react';
import { QuickPickModal } from './stream/QuickPickModal';

export default function BetCard(props: BetCardType) {
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const isActive = props.status === 'open' || props.status === 'locked';
  const isForStream = props.isForStream;

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

  const handleClick = () => {
    if (isActive) {
      setQuickPickOpen(true);
    }
  };

  return (
    <Card
      className={`h-full flex flex-col ${isActive ? 'bg-zinc-900' : ''} border-border shadow-lg overflow-hidden ${isActive && isForStream ? 'border-[#BDFF00]' : ''}`}
    >
      <CardHeader className="p-4 pb-0 flex flex-row gap-3 items-center">
        <img src={getThumbnailUrl(props.thumbnail)} className="aspect-square w-9 h-9 rounded-md" />
        <CardTitle
          onClick={handleClick}
          className="text-md cursor-pointer hover:underline line-clamp-2"
        >
          {props.name} - {!isActive ? props.status.toUpperCase(0) : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 p-4 justify-center">
        <div className="flex flex-col">
          {props.type === 'stream' && (
            <Link
              to={`/stream/${props.streamId}`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Video className="h-5 w-5" /> {props.streamName}
            </Link>
          )}
          {props.creator && (
            <Link
              to={`/${props.creator}`}
              className="text-sm text-[#7AFF14] hover:text-foreground transition-colors"
            >
              {props.creator}
            </Link>
          )}
        </div>
        {props.options.slice(0, 2).map((option, i) => (
          <div
            key={i}
            onClick={handleClick}
            className="flex-1 flex gap-4 items-center justify-between hover:bg-[#BDFF00] hover:text-black  transition-all cursor-pointer px-2 py-1 rounded-md"
          >
            <div
              className={cn(
                'text-sm rounded-full font-semibold',
                option.selected && 'text-[#BDFF00]'
              )}
            >
              {option.option}
            </div>
            <div className="text-lg font-semibold flex">{option.percentage}%</div>
          </div>
        ))}
        {props.options.length > 2 && (
          <div
            onClick={handleClick}
            className="flex-1 flex gap-4 items-center justify-between hover:bg-[#BDFF00] hover:text-black transition-all cursor-pointer px-2 py-1 rounded-md"
          >
            <div className="text-sm rounded-full font-semibold">
              {props.options.length - 2} more...
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="flex gap-2 items-center text-gray-400 cursor-pointer">
              <div className="flex gap-2 text-sm items-center">
                <img src="/icons/sweep-coins.png" alt="Stream Coins" className="h-3 w-5" />
                {props.totalPot.streamCoins}
              </div>
              <div className="flex gap-1 text-sm items-center">
                <img src="/icons/gold-coins.png" alt="gold-coins" className="h-4 w-4" />
                {props.totalPot.goldCoins}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">Total Pot</TooltipContent>
        </Tooltip>
      </CardFooter>
      {quickPickOpen && (
        <QuickPickModal
          open={quickPickOpen}
          onOpenChange={setQuickPickOpen}
          streamId={props.streamId}
          roundId={props.roundId}
          streamName={props.streamName}
        />
      )}
    </Card>
  );
}
