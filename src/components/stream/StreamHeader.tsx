import { StreamStatusBadge } from '@/components/stream/StreamStatusBadge';
import { StreamStatus } from '@/enums';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';

interface StreamHeaderProps {
  stream: {
    status: StreamStatus;
    scheduledStartTime?: string;
    name: string;
    streamName?: string;
    description?: string;
  } | null;
  viewerCount: number | null;
}

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
    <Card className="bg-gradient-to-br from-zinc-800/80 via-zinc-900/90 to-black border-zinc-700/60 shadow-2xl">
      <CardHeader className="space-y-5">
        <div className="flex items-center gap-4 flex-wrap">
          <StreamStatusBadge 
            status={stream.status}
            scheduledStartTime={stream.scheduledStartTime}
            multiline={false}
          />
          
          {/* Viewer Count */}
          {isStreamLive && (
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              {!hasImageError && (
                <img 
                  src="/icons/person.svg" 
                  alt="viewers" 
                  className="w-4 h-4 opacity-80"
                  onError={handleImageError}
                />
              )}
              <span className="font-medium">{displayViewerCount} watching</span>
            </div>
          )}
        </div>
        <CardTitle className="text-3xl md:text-4xl lg:text-5xl leading-[1.2] tracking-tight pb-1 break-words hyphens-auto">
          {stream.name}
        </CardTitle>
        <CardDescription className="text-base md:text-lg leading-relaxed font-normal text-zinc-300 max-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {stream.description || 'No description available.'}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};
