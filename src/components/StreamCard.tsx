import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { StreamActions } from '@/components/StreamActions';
import { Button } from '@/components/ui/button';
import { Trash, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnimations } from '@/hooks/useAnimations';
import { getImageLink, formatDate, formatTime } from '@/utils/helper';
import { useState } from 'react';
import { BettingRoundStatus, StreamStatus } from '@/enums';
import { useAuthContext } from '@/contexts/AuthContext';
import { StreamStatusBadge } from '@/components/stream/StreamStatusBadge';
import { QuickPickModal } from './stream/QuickPickModal';
import { format } from 'date-fns';

interface StreamCardProps {
  stream: any;
  isLive?: boolean;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  showAdminControls?: boolean;
}

export const StreamCard = ({
  stream,
  isAdmin,
  onDelete,
  onUpdate,
  showAdminControls = false,
}: StreamCardProps) => {
  const shouldShowAdminControls = isAdmin && showAdminControls;
  const { cardVariants } = useAnimations();
  const { session } = useAuthContext();
  const isLive = stream?.streamStatus === StreamStatus.LIVE;
  const isStreamScheduled = stream?.streamStatus === StreamStatus.SCHEDULED;
  const isBettingOpen =
    stream?.bettingRoundStatus === BettingRoundStatus.OPEN;
  const isBettingLocked =
    stream?.bettingRoundStatus === BettingRoundStatus.LOCKED;
  const [quickPickOpen, setQuickPickOpen] = useState(false);

  // Handle both full URLs and storage paths
  const [imageLoading, setImageLoading] = useState(true);
  const getThumbnailUrl = () => {
    const thumbnail = stream.thumbnailURL || stream.thumbnailUrl;

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

    return getImageLink(thumbnail) || '/placeholder.svg' ;
  };

  // Random viewer count for visual enhancement
  const viewerCount = isLive ? Math.floor(Math.random() * 500) + 50 : 0;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      variants={cardVariants}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col bg-card !bg-[#181818] border border-border shadow-lg overflow-hidden">
        <Link to={`/stream/${stream.id}`} className="block flex-grow">
          <div className="aspect-video bg-muted relative overflow-hidden group">
            {shouldShowAdminControls && onDelete && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 0, 0, 0.2)' }}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(stream.id);
                }}
                className="absolute top-2 right-2 p-2 bg-background/80 hover:bg-background rounded-full z-10 transition-colors"
              >
                <Trash className="h-4 w-4 text-destructive" />
              </motion.button>
            )}

            <div className="w-full h-full overflow-hidden relative">
              {/* Loader overlay */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
                  {/* Simple spinner */}
                  <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                </div>
              )}
              <motion.img
                src={getThumbnailUrl()}
                alt={stream.streamName}
                className="object-cover w-full h-full transition-transform duration-700"
                whileHover={{ scale: 1.05 }}
                onLoad={() => setImageLoading(false)}
                onError={e => {
                  e.currentTarget.src = '/placeholder.svg';
                  setImageLoading(false);
                }}
              />
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t via-background/30 to-transparent group-hover:opacity-40 transition-opacity duration-300"></div>

            {/* Status badges */}
            {isLive && (
              <div className="absolute top-2 left-2 z-30">
                <StreamStatusBadge 
                  status={StreamStatus.LIVE}
                />
              </div>
            )}

            {/* SCHEDULED badge */}
            {stream.streamStatus === StreamStatus.SCHEDULED && stream.scheduledStartTime && (
              <div className="absolute top-2 left-2 z-30">
                <StreamStatusBadge 
                  status={StreamStatus.SCHEDULED}
                  scheduledStartTime={stream.scheduledStartTime}
                  multiline={true}
                />
              </div>
            )}
          </div>
        </Link>

        <div className="p-4 flex flex-col justify-between">
          {stream.profiles?.username && (
            <p className="text-sm text-muted-foreground mb-4 flex items-center">
              {stream.profiles.avatar_url ? (
                <img
                  src={stream.profiles.avatar_url}
                  alt={stream.profiles.username}
                  className="w-5 h-5 rounded-full mr-2 object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full mr-2 bg-primary/20" />
              )}
              <span>{stream.profiles.username}</span>
            </p>
          )}

          <div className="space-y-2">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              {stream.state && (
                <div
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    stream.state === 'live'
                      ? 'bg-green-500/20 text-green-500'
                      : stream.state === 'upcoming'
                        ? 'bg-blue-500/20 text-blue-500'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {stream.state === 'live'
                    ? 'Live'
                    : stream.state === 'upcoming'
                      ? 'Upcoming'
                      : stream.state === 'ended'
                        ? 'Ended'
                        : stream.state}
                </div>
              )}

              {(isBettingLocked || isBettingOpen) && (
                <div
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-md flex items-center gap-1',
                    isBettingLocked
                      ? 'bg-orange-500/20 text-orange-500'
                      : isBettingOpen ? 'bg-primary/20 text-primary'
                        : ''
                  )}
                >
                  {isBettingLocked ? (
                    <LockKeyhole className="h-3 w-3" />
                  ) : isBettingOpen ? (
                    <LockKeyholeOpen className="h-3 w-3" />
                  ) : null}
                  <span>
                    {isBettingLocked ? 'Picks Locked' : isBettingOpen ? 'Picks Open' : ''}
                  </span>
                </div>
              )}
            </div>
            <div className='flex flex-col mb-6 gap-1 h-16'>
              <p className="font-semibold text-[#D7DFEF] text-[15px] items-center truncate">
                {stream.streamName}
              </p>
              {stream.creatorUsername && 
                <Link
                  to={`/${stream.creatorUsername}`}
                  className="text-sm text-[#7AFF14] hover:text-foreground transition-colors"
                >
                  {stream.creatorUsername}
                </Link>
              }
              {stream.endTime && 
                <p className="text-gray-400 text-xs">
                  Ended: {formatDate(stream.endTime)} at {formatTime(stream.endTime)}
                </p>
              }
            </div>
            <div className='!mb-3 !mt-5 space-y-2'>
              <StreamActions streamId={stream.id} onDelete={undefined} />
              {stream.streamStatus && stream.streamStatus !== StreamStatus.ENDED && 

                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuickPickOpen(true);
                  }}
                  disabled={!isBettingOpen}
                  className={cn(
                    'w-full rounded-full border font-medium text-[12px] flex items-center justify-center gap-1.5',
                    isBettingOpen
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-black border-emerald-500'
                      : 'bg-emerald-500/50 text-white/80 border-emerald-500/50 cursor-not-allowed'
                  )}
                >
                  {isBettingOpen 
                    ? 'Quick Pick' 
                    : isBettingLocked 
                      ? (
                        <>
                          <LockKeyhole className="h-3 w-3" />
                          <span>Picks Locked</span>
                        </>
                      )
                      : 'Picks Open Soon'}
                </Button>
              }
            </div>
          </div>
        </div>
      </Card>
      <QuickPickModal
        open={quickPickOpen}
        onOpenChange={setQuickPickOpen}
        streamId={stream.id}
        streamName={stream.streamName}
      />
    </motion.div>
  );
};
