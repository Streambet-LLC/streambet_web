import { BetCard as BetCardType } from '@/types/bet';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import FeaturedBetCard from './FeaturedBetCard';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getImageLink } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { BettingRoundStatus, StreamStatus } from '@/enums';
import { StreamStatusBadge } from '@/components/stream/StreamStatusBadge';
import api from '@/integrations/api/client';
import moment from 'moment';
import { Badge } from './ui/badge';
import { getBetRoundTypeLabel, getBetRoundTypeClass } from '@/utils/betRoundHelpers';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

export default function BetCard(props: BetCardType) {
  const [wiggle, setWiggle] = useState(false);
  const [cardData, setCardData] = useState(props);
  const [showImageModal, setShowImageModal] = useState(false);
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

  const getThumbnailUrl = (thumbnail: string) => {
    if (!thumbnail) return '/placeholder.svg';
    if (thumbnail.startsWith('http')) return thumbnail;

    if (
      thumbnail.includes('stream-thumbnails/') &&
      !thumbnail.includes(import.meta.env.VITE_SUPABASE_URL)
    ) {
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${thumbnail}`;
    }

    return getImageLink(thumbnail) || '/placeholder.svg';
  };

  const navigate = useNavigate();

  const getNavigationPath = () => {
    if (cardData.type === 'non-video') {
      return `/nonvideo/${cardData.streamId}`;
    } else if (cardData.type === 'stream') {
      return `/stream/${cardData.streamId}`;
    }
    return null;
  };

  const handleThumbnailClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (cardData.type === 'non-video' && props.isForNonVideo) {
      // If in non-video room, open full-screen image
      setShowImageModal(true);
    } else {
      const path = getNavigationPath();
      if (path) navigate(path);
    }
  };

  const handleClick = (selectedOption: any) => {
    if (statuses.canOpen) {
      props.setQuickPick(
        props.streamId,
        props.roundId,
        props.streamName,
        selectedOption ? selectedOption.option : null,
        cardData.description
      );
    }
  };

  const updateStatuses = (data: any) => {
    const statusLower = data?.status?.toString()?.toLowerCase() || null;
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

  const refreshPotData = async () => {
    if (!cardData.roundId) return;
    try {
      const { data: resp } = await api.betting.getBettingCardRoundData(cardData.roundId);
      if (cardData.totalPot.streamCoins !== resp.data.totalPot.streamCoins) {
        setWiggle(true);
        setTimeout(() => setWiggle(false), 1000);
      }
      // Only update pot data, preserve mechanism/meta from props
      setCardData(prev => ({
        ...prev,
        totalPot: resp.data.totalPot,
        cadeCoinUsersCount: resp.data.cadeCoinUsersCount,
      }));
      setCardData(resp.data);
      updateStatuses(resp.data);
    } catch (e) {}
  };

  useEffect(() => {
    updateStatuses(props);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshPotData();
    }, 10 * 1000);
    return () => clearInterval(intervalId);
  }, [cardData.roundId]);

  const displayedOptions = useMemo(() => {
    const topOptions = cardData.options.slice(0, 2);
    const topOptionsLabel = topOptions.map(option => option.id);
    const userPickedOption = cardData.options.find(
      option => !!option.userBet && !topOptionsLabel.includes(option.id)
    );

    return userPickedOption ? topOptions.concat(userPickedOption) : topOptions;
  }, [cardData]);

  const CardWrapper = props.isFeatured ? FeaturedBetCard : Card;

  return (
    <>
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'group h-full',
        props.isFeatured && 'pt-1 overflow-hidden rounded-featured-card'
      )}
    >
      <CardWrapper
        className={cn(
          'h-full flex flex-col overflow-hidden transition-all duration-200 rounded-xl',
          wiggle && 'wiggle',
          !props.isFeatured &&
            'relative bg-card-grid-bg border border-card-grid-border shadow-[0px_2px_8px_0px_rgba(0,0,0,0.5)] hover:border-card-grid-border-hover hover:shadow-[0px_4px_16px_0px_rgba(189,255,0,0.1)]',
          props.isFeatured && 'bg-transparent border-0 shadow-none min-h-[420px]'
        )}
      >
      <CardHeader className="p-4 pb-0 flex flex-col gap-3">
        {/* Stream status badges - only for streams */}
        {cardData.type === 'stream' && (
          <>
            {cardData.streamStatus === StreamStatus.SCHEDULED && (
              <div className="flex justify-start">
                <StreamStatusBadge
                  status={StreamStatus.SCHEDULED}
                  scheduledStartTime={cardData.scheduledStartTime}
                  multiline={false}
                />
              </div>
            )}
            {cardData.streamStatus === StreamStatus.LIVE && (
              <div className="flex justify-start">
                <StreamStatusBadge status={StreamStatus.LIVE} />
              </div>
            )}
            {cardData.streamStatus === StreamStatus.ENDED && (
              <div className="flex justify-start">
                <StreamStatusBadge status={StreamStatus.ENDED} />
              </div>
            )}
          </>
        )}
        <div className="flex flex-col gap-2">
          <div className='flex flex-col'>
            <div className="flex items-center gap-2">
              <CardTitle
                onClick={(e) => {
                  e.stopPropagation();
                  const path = getNavigationPath();
                  if (path) navigate(path);
                }}
                className={cn(
                  'text-md line-clamp-2',
                  getNavigationPath() && 'cursor-pointer hover:underline'
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
            {props.creator && (
              <Link
                to={`/${props.creator}`}
                className="text-sm text-creator-green hover:text-foreground transition-colors"
              >
                {props.creator}
              </Link>
            )}
          </div>
          {!props.isForStream && 
            <>
              <div className='flex flex-col gap-1'>
                {props.type === 'stream' && (
                  <Link
                    to={`/stream/${props.streamId}`}
                    className="flex gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
                  >
                    <div>
                      <Video className="h-4 w-4" />
                    </div>
                    {props.streamName}
                  </Link>
                )}
                {/* Description moved to QuickPickModal */}
              </div>
              <div 
                className='relative rounded-md overflow-clip cursor-pointer hover:opacity-90 transition-opacity'
                onClick={handleThumbnailClick}
              >
                <img
                  src={getThumbnailUrl(cardData.thumbnail)}
                  className="aspect-video w-full object-cover"
                />
                <div className='top-0 absolute w-full h-full bg-gradient-to-t from-[#bdff001a]' />
                <div className='top-0 absolute w-full h-full bg-gradient-to-t from-[#00000080] z-10' />
              </div>
            </>
          }
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4">
        {displayedOptions.map((option, i) => (
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
              'flex flex-col justify-between transition-all px-3 py-1 rounded-md border bg-bet-option-bg border-bet-option-border',
              statuses.canOpen
                ? 'hover:text-electric-lime hover:shadow-[0_0_20px_rgba(189,255,0,0.4)] cursor-pointer'
                : 'cursor-not-allowed opacity-60',
              option.isWinner && '!bg-electric-lime !text-black !border-electric-lime'
            )}
          >
            <div className='flex flex-1 gap-4 items-center justify-between'>
              <div
                className={cn(
                  'text-sm rounded-full font-semibold',
                  option.userBet && 'text-electric-lime'
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
            {option.userBet && (
              <div className='text-xs py-1 text-electric-lime'>
                {props.mechanism?.toLowerCase?.() === 'sentiment'
                  ? 'Your pick'
                  : `Your pick for ${option.userBet.amount} Cade Coins`}
              </div>
            )}
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
              'flex gap-4 items-center justify-between transition-all px-3 py-2.5 rounded-md border bg-bet-option-bg border-bet-option-border',
              statuses.canOpen
                ? 'hover:text-electric-lime hover:shadow-[0_0_20px_rgba(189,255,0,0.4)] cursor-pointer'
                : 'cursor-not-allowed opacity-60'
            )}
          >
            <div className="text-sm rounded-full font-semibold">
              {cardData.options.length - displayedOptions.length} more...
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto p-6 pt-0 px-4 gap-2">
        <div className="flex flex-col justify-between gap-3 w-full">
          <div className='flex w-full justify-between items-center gap-2'>
            <div className="flex gap-2 items-center">
              {/* Hide CadeCoin pool for sentiment picks */}
              {props.mechanism?.toLowerCase?.() !== 'sentiment' && (
                <>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="flex gap-1 text-sm items-center cursor-pointer">
                        <img src="/icons/cade-coins.png" alt="gold-coins" className="h-4 w-4" />
                        <span className="text-[#B4FF39] font-semibold">
                          {cardData.totalPot.cadeCoins || 0}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">Total Pot</TooltipContent>
                  </Tooltip>
                  {cardData.cadeCoinUsersCount !== undefined && cardData.cadeCoinUsersCount > 0 && (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex gap-1 items-center text-primary text-sm cursor-pointer">
                          <Users className="h-4 w-4 text-gray-300" />
                          <span className="font-semibold text-primary">{cardData.cadeCoinUsersCount}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">Total users with Picks</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
            {props.betRoundType && (
              <Badge className={cn('text-[10px] border', getBetRoundTypeClass(props.betRoundType))}>
                {getBetRoundTypeLabel(props.betRoundType)}
              </Badge>
            )}
          </div>
          {cardData.lockDate && (
            <StreamStatusBadge 
              status="lock" 
              lockDate={(() => {
                const date = new Date(cardData.lockDate);
                const formattedDate = moment(cardData.lockDate).format('MMM D, YYYY [at] h:mm A');
                const timezone = date.toLocaleTimeString('en-US', { 
                  timeZoneName: 'short' 
                }).split(' ').pop();
                return `${formattedDate} ${timezone}`;
              })()}
            />
          )}
        </div>
      </CardFooter>
    </CardWrapper>
    </motion.div>

    {/* Full-screen image modal for non-video thumbnails */}
    <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0">
        <DialogTitle className="sr-only">
          {cardData.streamName || 'Full size image preview'}
        </DialogTitle>
        <img
          src={getThumbnailUrl(cardData.thumbnail)}
          alt={cardData.streamName || 'Full size image'}
          className="w-full h-full object-contain"
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
