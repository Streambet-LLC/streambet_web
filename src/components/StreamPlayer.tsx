import { useStreamData } from '@/hooks/useStreamData';
import { StreamLoading } from './StreamLoading';
import { StreamOffline } from './StreamOffline';
import { VideoPlayer } from './VideoPlayer';
import { KickEmbed } from './stream/KickEmbed';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StreamPlayerProps {
  streamId: string;
}

export const StreamPlayer = ({ streamId }: StreamPlayerProps) => {
  const { data: stream, refetch } = useStreamData(streamId);
  const [kickEmbedLoading, setKickEmbedLoading] = useState(false);
  const [kickError, setKickError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set up thumbnail refresh on regular intervals
  useEffect(() => {
    if (stream?.is_live) {
      const refreshThumbnail = async () => {
        try {
          console.log('Refreshing thumbnail for stream:', streamId);

          if (stream.platform === 'custom') {
            await supabase.functions.invoke('update-thumbnail', {
              body: { streamId },
            });
          } else if (stream.platform === 'kick' && stream.embed_url) {
            await supabase.functions.invoke('capture-thumbnail', {
              body: {
                streamId,
                embedUrl: stream.embed_url,
              },
            });
          }

          // Refetch stream data to get updated thumbnail
          refetch();
        } catch (error) {
          console.error('Error refreshing thumbnail:', error);
        }
      };

      // Initial thumbnail refresh
      refreshThumbnail();

      // Set up interval for regular refreshes (every 60 seconds)
      refreshIntervalRef.current = setInterval(refreshThumbnail, 60000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [streamId, stream?.is_live, stream?.platform, stream?.embed_url]);

  useEffect(() => {
    if (stream?.platform === 'kick') {
      setKickEmbedLoading(true);
      setKickError(null);
      // Reset state when stream changes
      const timeout = setTimeout(() => {
        setKickEmbedLoading(false);
      }, 5000); // Assume loading timeout after 5 seconds

      return () => clearTimeout(timeout);
    }
  }, [stream?.embed_url]);

  if (!stream) {
    return <StreamLoading />;
  }

  // For Kick.com streams, check if they have a valid embed_url
  if (stream.platform === 'kick' && stream.embed_url) {
    console.log('Rendering Kick embed for URL:', stream.embed_url);

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
        <KickEmbed embedUrl={stream.embed_url} />
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <VideoPlayer playbackId={stream.playback_id} thumbnailUrl={stream.thumbnail_url} />
      {!stream.is_live && stream.platform !== 'kick' && (
        <StreamOffline thumbnailUrl={stream.thumbnail_url} />
      )}
    </div>
  );
};
