import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { StreamActions } from './StreamActions';
import { Eye, Trash, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnimations } from '@/hooks/useAnimations';
import { getImageLink } from '@/utils/helper';

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
  isLive,
  onDelete,
  onUpdate,
  showAdminControls = false,
}: StreamCardProps) => {
  const shouldShowAdminControls = isAdmin && showAdminControls;
  const { cardVariants } = useAnimations();
  console.log('stream', stream);
  // Handle both full URLs and storage paths
  const getThumbnailUrl = () => {
    if (!stream.thumbnailURL) {
      return '/placeholder.svg';
    }

    // If it's already a full URL (starts with http or https), use it directly
    if (stream.thumbnailURL.startsWith('http')) {
      return stream.thumbnailURL;
    }

    // If it's a storage path from bucket but doesn't have the storage URL prefix
    if (
      stream.thumbnailURL.includes('stream-thumbnails/') &&
      !stream.thumbnailURL.includes(import.meta.env.VITE_SUPABASE_URL)
    ) {
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${stream.thumbnailURL}`;
    }

    return getImageLink(stream.thumbnailURL) || '/placeholder.svg' ;
  };
  console.log('getThumbnailUrl', getThumbnailUrl());
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

            <div className="w-full h-full overflow-hidden">
              <motion.img
                src={getThumbnailUrl()}
                alt={stream.streamName}
                className="object-cover w-full h-full transition-transform duration-700"
                whileHover={{ scale: 1.05 }}
                onError={e => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t via-background/30 to-transparent group-hover:opacity-40 transition-opacity duration-300"></div>

            {/* LIVE badge with animation */}
            {isLive && (
              <div className="absolute top-2 left-2 z-30">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                >
                  <div className="flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded-md shadow-lg">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <span className="font-bold text-xs uppercase tracking-wider">Live</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Viewer count badge */}
            {/* {isLive && (
              <div className="absolute top-2 right-2 z-20">
                <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm text-foreground px-2 py-1 rounded text-xs">
                  <Users size={12} className="text-primary" />
                  <span>{viewerCount}</span>
                </div>
              </div>
            )} */}

            {/* Stream title overlay */}
            {/* <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-semibold text-lg text-white mb-1 line-clamp-1 group-hover:underline decoration-primary decoration-2 underline-offset-2">
                {stream.streamName}
              </h3>
              {stream.description && (
                <p className="text-sm text-gray-300 line-clamp-2 opacity-90">
                  {stream.description}
                </p>
              )}
            </div> */}
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

              {stream.is_betting_locked !== undefined && (
                <div
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    stream.is_betting_locked
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'bg-primary/20 text-primary'
                  )}
                >
                  {stream.is_betting_locked ? 'Betting Locked' : 'Betting Open'}
                </div>
              )}
            </div>
            <p className="font-semibold text-[#D7DFEF] text-[15px] mb-5">
                {stream.streamName}
            </p>
            <div className='!mb-3 !mt-5'>
              <StreamActions streamId={stream.id} onDelete={undefined} />
              </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
