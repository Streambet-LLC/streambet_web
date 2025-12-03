import { BetCard as BetCardType } from '@/types/bet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getImageLink } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { QuickPickModal } from './stream/QuickPickModal';
import { BettingRoundStatus, StreamStatus } from '@/enums';
import { StreamStatusBadge } from '@/components/stream/StreamStatusBadge';
import api from '@/integrations/api/client';
import moment from 'moment';
import { LinkItUrl } from 'react-linkify-it';

export default function BetCard(props: BetCardType) {
  const [wiggle, setWiggle] = useState(false);
  const [cardData, setCardData] = useState(props);
  const [statuses, setStatuses] = useState({
    statusLower: (props as any)?.status?.toString()?.toLowerCase?.() || null,
    isEnded: false,
    isLocked: false,
    isCancelled: false,
    isCreated: false,
    isOpen: false,
    hasOptions: false,
    nonClickable: false,
    canOpen: false,
    isForStream: false,
  });

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

  const handleClick = selectedOption => {
    if (statuses.canOpen) {
      console.log(selectedOption);

      props.setQuickPick(
        props.streamId,
        props.roundId,
        props.streamName,
        selectedOption ? selectedOption.option : null
      );
    }
  };

  const updateStatuses = data => {
    const statusLower = (data as any)?.status?.toString()?.toLowerCase?.() || null;
    const isEnded = statusLower === BettingRoundStatus.CLOSED || statusLower === 'ended';
    const isLocked = statusLower === BettingRoundStatus.LOCKED;
    const isCancelled = statusLower === BettingRoundStatus.CANCELLED;
    const isCreated = statusLower === BettingRoundStatus.CREATED;
    const isOpen = statusLower === BettingRoundStatus.OPEN;
    const hasOptions = Array.isArray(data.options) && data.options.length > 0;
    const nonClickable = isEnded || isCancelled || (isCreated && !hasOptions);
    const canOpen = Boolean(data.streamId) && !nonClickable;
    const isForStream = props.isForStream;

    setStatuses({
      statusLower,
      isEnded,
      isLocked,
      isCancelled,
      isCreated,
      isOpen,
      hasOptions,
      nonClickable,
      canOpen,
      isForStream,
    });
  };

  const getData = async () => {
    if (!cardData.roundId) return;
    try {
      const { data: resp } = await api.betting.getBettingCardRoundData(cardData.roundId);
      if (cardData.totalPot.streamCoins !== resp.data.totalPot.streamCoins) {
        setWiggle(true);
        setTimeout(() => {
          setWiggle(false);
        }, 1000);
      }
      setCardData(resp.data);
      updateStatuses(resp.data);
    } catch (e) {
    }
  };

  useEffect(() => {
    updateStatuses(props);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      getData();
    }, 10 * 1000);
  }, [cardData]);

  return (
    <Card
      className={`${wiggle && 'wiggle'} h-full flex flex-col border border-gray-600 shadow-lg overflow-hidden ${(statuses.isForStream || statuses.isOpen || statuses.isCreated) && 'border-[#BDFF00]'}`}
    >
      <CardHeader className="p-4 pb-0 flex flex-col gap-3">
        {cardData.streamStatus === StreamStatus.SCHEDULED && (
          <div className="flex justify-start">
            <StreamStatusBadge
              status={StreamStatus.SCHEDULED}
              scheduledStartTime={cardData.scheduledStartTime}
              multiline={false}
              isStreamType={cardData.type === 'stream'}
            />
          </div>
        )}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <img
              src={getThumbnailUrl(cardData.thumbnail)}
              className="aspect-square w-14 h-14 rounded-md object-cover"
            />
            <div className="flex items-center gap-2">
              <CardTitle
                onClick={
                  statuses.canOpen
                    ? () => {
                        handleClick(null);
                      }
                    : undefined
                }
                className={cn(
                  'text-md line-clamp-2',
                  statuses.canOpen
                    ? 'cursor-pointer hover:underline'
                    : 'cursor-not-allowed opacity-70'
                )}
              >
                {cardData.name}
              </CardTitle>
              {(statuses.isLocked ||
                statuses.isEnded ||
                statuses.isCancelled ||
                statuses.isCreated) && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-semibold border',
                    statuses.isEnded
                      ? 'bg-[#2a2a2a] text-white border-red-500/40'
                      : statuses.isCancelled
                        ? 'bg-[#2a2a2a] text-white border-red-500/40'
                        : statuses.isCreated
                          ? cn(
                              'bg-[#2a2a2a] text-white',
                              statuses.hasOptions ? 'border-blue-400/40' : 'border-muted'
                            )
                          : 'bg-[#2a2a2a] text-white border-yellow-400/40'
                  )}
                  title={
                    statuses.isEnded
                      ? 'Ended Round'
                      : statuses.isCancelled
                        ? 'Cancelled Round'
                        : statuses.isCreated
                          ? 'Created Round'
                          : 'Locked Round'
                  }
                >
                  {statuses.isEnded
                    ? 'Ended'
                    : statuses.isCancelled
                      ? 'Cancelled'
                      : statuses.isCreated
                        ? statuses.hasOptions
                          ? 'Created'
                          : 'Draft'
                        : 'Locked'}
                </span>
              )}
            </div>
          </div>
          {cardData.description && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild className="cursor-default">
                <CardDescription className="line-clamp-2 text-xs">
                  {cardData.description}
                </CardDescription>
              </TooltipTrigger>
              <TooltipContent className="w-60" side="bottom">
                <LinkItUrl className='text-[#7AFF14]'>
                  {cardData.description}
                </LinkItUrl>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 p-4">
        <div className="flex flex-col">
          {props.type === 'stream' && (
            <Link
              to={`/stream/${props.streamId}`}
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
              to={`/${props.creator}`}
              className="text-sm text-[#7AFF14] hover:text-foreground transition-colors"
            >
              {props.creator}
            </Link>
          )}
        </div>
        {cardData.options.slice(0, 2).map((option, i) => (
          <div
            key={i}
            onClick={
              statuses.canOpen
                ? () => {
                    handleClick(option);
                  }
                : undefined
            }
            className={cn(
              'flex-1 flex gap-4 items-center justify-between transition-all px-2 py-1 rounded-md',
              statuses.canOpen
                ? 'hover:bg-[#BDFF00] hover:text-black cursor-pointer'
                : 'cursor-not-allowed opacity-60',
              option.isWinner && 'bg-[#BDFF00] text-black'
            )}
          >
            <div
              className={cn(
                'text-sm rounded-full font-semibold',
                option.selected && 'text-[#BDFF00]'
              )}
            >
              {option.option}{' '}
              {option.isWinner && (
                <span
                  className={cn(
                    'ml-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-[#2a2a2a] text-white border-red-500/40'
                  )}
                >
                  ✅ Winning Side
                </span>
              )}
            </div>
            <div className="text-lg font-semibold flex">{option.percentage}%</div>
          </div>
        ))}
        {cardData.options.length > 2 && (
          <div
            onClick={
              statuses.canOpen
                ? () => {
                    handleClick(null);
                  }
                : undefined
            }
            className={cn(
              'flex-1 flex gap-4 items-center justify-between transition-all px-2 py-1 rounded-md',
              statuses.canOpen
                ? 'hover:bg-[#BDFF00] hover:text-black cursor-pointer'
                : 'cursor-not-allowed opacity-60'
            )}
          >
            <div className="text-sm rounded-full font-semibold">
              {cardData.options.length - 2} more...
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
                  {cardData.totalPot.streamCoins}
                </div>
                <div className="flex gap-1 text-sm items-center">
                  <img src="/icons/gold-coins.png" alt="gold-coins" className="h-4 w-4" />
                  {cardData.totalPot.goldCoins}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Total Pot</TooltipContent>
          </Tooltip>
          {cardData.lockDate && (
            <div className="">
              <p>Auto Locking {moment(cardData.lockDate).fromNow()}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
