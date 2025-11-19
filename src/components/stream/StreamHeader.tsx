import { StreamStatusBadge } from '@/components/stream/StreamStatusBadge';
import { StreamStatus } from '@/enums';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface StreamHeaderProps {
  stream: {
    status: StreamStatus;
    scheduledStartTime?: string;
    name: string;
    streamName?: string;
    description?: string;
    creatorUsername?: string;
  } | null;
  viewerCount: number | null;
}

// Header styling constants
const HEADER_STYLES = {
  CARD: 'bg-gradient-to-br from-zinc-800/80 via-zinc-900/90 to-black border-zinc-700/60 shadow-2xl',
  CARD_HEADER: 'space-y-5',
  STATUS_ROW: 'flex items-center gap-4 flex-wrap',
  VIEWER_COUNT: {
    container: 'flex items-center gap-2.5 text-sm text-zinc-300',
    icon: 'w-4 h-4 opacity-80',
    text: 'font-medium',
  },
  TITLE: 'text-2xl md:text-3xl lg:text-4xl leading-[1.2] tracking-tight pb-1 break-words hyphens-auto',
  DESCRIPTION: 'text-sm md:text-base leading-relaxed font-normal text-zinc-300 max-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent',
} as const;

/**
 * Displays stream header with status badge, viewer count, title, and description
 * @param {object | null} stream - Stream data
 * @param {number | null} viewerCount - Current viewer count (shown only when live)
 */
export const StreamHeader = ({ stream, viewerCount }: StreamHeaderProps) => {
  if (!stream) return null;
  
  const isStreamLive = stream.status === StreamStatus.LIVE;
  const displayViewerCount = isStreamLive ? (viewerCount ?? 0) : 0;
  const [hasImageError, setHasImageError] = useState(false);

  const handleImageError = () => {
    setHasImageError(true);
  };

  return (
    <Card className={HEADER_STYLES.CARD}>
      <CardHeader className={HEADER_STYLES.CARD_HEADER}>
        <div className={HEADER_STYLES.STATUS_ROW}>
          <StreamStatusBadge 
            status={stream.status}
            scheduledStartTime={stream.scheduledStartTime}
            multiline={false}
          />
          
          {/* Viewer Count */}
          {isStreamLive && (
            <div className={HEADER_STYLES.VIEWER_COUNT.container}>
              {!hasImageError && (
                <img 
                  src="/icons/person.svg" 
                  alt="viewers" 
                  className={HEADER_STYLES.VIEWER_COUNT.icon}
                  onError={handleImageError}
                />
              )}
              <span className={HEADER_STYLES.VIEWER_COUNT.text}>{displayViewerCount} watching</span>
            </div>
          )}
        </div>
        <CardTitle className={HEADER_STYLES.TITLE}>
          {stream.name}
          <div className='text-[20px]'>
            <Link
              to={`/${stream.creatorUsername}`}
              className="text-[#7AFF14] hover:text-foreground transition-colors"
            >
              {stream.creatorUsername}
            </Link>
          </div>
        </CardTitle>
        <CardDescription className={HEADER_STYLES.DESCRIPTION}>
          
          {stream.description || 'No description available.'}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};