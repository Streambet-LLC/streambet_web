import { useStreamData } from '@/hooks/useStreamData';
import { StreamLoading } from './StreamLoading';
import { StreamOffline } from './StreamOffline';
import { KickEmbed } from './stream/KickEmbed';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ReactPlayer from 'react-player';

interface StreamPlayerProps {
  streamId: string;
  showInfo?: boolean;
}

export const StreamPlayer = ({ streamId, showInfo = false }: StreamPlayerProps) => {
  const { data: stream, refetch } = useStreamData(streamId);
  const [kickEmbedLoading, setKickEmbedLoading] = useState(false);
  const [kickError, setKickError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (stream?.data?.platformName === 'kick') {
      setKickEmbedLoading(true);
      setKickError(null);
      // Reset state when stream changes
      const timeout = setTimeout(() => {
        setKickEmbedLoading(false);
      }, 5000); // Assume loading timeout after 5 seconds

      return () => clearTimeout(timeout);
    }
  }, [stream?.data?.embeddedUrl]);

  if (!stream) {
    return <StreamLoading />;
  }

  // For Kick.com streams, check if they have a valid embeddedUrl
  if (stream?.data?.platformName === 'kick' && stream?.data?.embeddedUrl) {

    return (
      <div
        className="relative aspect-video bg-black rounded-lg overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Overlay Header */}
        {showInfo && !isHovered && (
          <div
            className="absolute top-0 left-0 w-full flex items-center px-6"
            style={{
              height: 50,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              zIndex: 20,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(215, 223, 239, 1)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {stream?.data?.name}
            </span>
          </div>
        )}
        {kickEmbedLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50 text-white">
            Loading Kick.com stream...
          </div>
        )}
        {kickError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50 text-white">
            Error loading stream: {kickError}
          </div>
        )}
        <KickEmbed embedUrl={stream?.data?.embeddedUrl} />
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Overlay Header */}
      {showInfo && !isHovered && (
        <div
          className="absolute top-0 left-0 w-full flex items-center px-2"
          style={{
            height: 50,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            zIndex: 20,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(215, 223, 239, 1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {stream?.data?.name}
          </span>
        </div>
      )}
      <div className="relative w-full h-full">
       <ReactPlayer url={stream?.data?.embeddedUrl} controls={true} width={'100%'} height={'100%'}/>
    </div>
    </div>
  );
};
