import { useStreamData } from '@/hooks/useStreamData';
import { StreamLoading } from './StreamLoading';
import { StreamOffline } from './StreamOffline';
import { VideoPlayer } from './VideoPlayer';
import { KickEmbed } from './stream/KickEmbed';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ReactPlayer from 'react-player';

interface StreamPlayerProps {
  streamId: string;
}

export const StreamPlayer = ({ streamId }: StreamPlayerProps) => {
  const { data: stream, refetch } = useStreamData(streamId);
  const [kickEmbedLoading, setKickEmbedLoading] = useState(false);
  const [kickError, setKickError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

 

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

  console.log(stream,"streamstreamstream")

  // For Kick.com streams, check if they have a valid embeddedUrl
  if (stream?.data?.platformName === 'kick' && stream?.data?.embeddedUrl) {
    console.log('Rendering Kick embed for URL', stream?.data?.embeddedUrl);

    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
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
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
       <div className="relative w-full h-full">
       <ReactPlayer url={stream?.data?.embeddedUrl} controls={true} width={'100%'} height={'100%'}/>
    </div>
    </div>
  );
};
