import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye } from 'lucide-react';

interface StreamDetailsProps {
  stream: any;
  streamId: string;
}

export const StreamDetails = ({ stream, streamId }: StreamDetailsProps) => {
  const [viewerCount, setViewerCount] = useState<number>(stream?.viewer_count || 0);
  const [debouncedViewerCount, setDebouncedViewerCount] = useState<number>(
    stream?.viewer_count || 0
  );
  const { toast } = useToast();

  // Debounce the viewer count updates to prevent flickering
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedViewerCount(viewerCount);
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [viewerCount]);

  // Format large numbers with commas
  const formatViewerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Define updateViewerCountInDatabase at the component level, not inside useEffect
  const updateViewerCountInDatabase = useCallback(
    async (count: number) => {
      try {
        const { error } = await supabase
          .from('streams')
          .update({ viewer_count: count })
          .eq('id', streamId);

        if (error) {
          console.error('Error updating viewer count in database:', error);
        } else {
          console.log(`Updated viewer count in database: ${count}`);
        }
      } catch (err) {
        console.error('Failed to update viewer count:', err);
      }
    },
    [streamId]
  );

  // Generate and manage unique viewer ID
  useEffect(() => {
    if (!streamId) return;

    // Generate a truly unique viewer ID for this browser tab
    let viewerId = sessionStorage.getItem(`stream_viewer_${streamId}`);
    if (!viewerId) {
      viewerId = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
      sessionStorage.setItem(`stream_viewer_${streamId}`, viewerId);
    }

    // Debug info
    console.log(`This tab's unique viewer ID: ${viewerId}`);

    // Create a unique presence channel for this specific viewer
    const channelName = `presence_${streamId}`;

    // Track presence for this viewer
    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: viewerId,
        },
      },
    });

    presenceChannel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        console.log(`Tracking presence for viewer: ${viewerId}`);
        await presenceChannel.track({
          online_at: new Date().toISOString(),
        });
      }
    });

    // Track last update time to throttle database writes
    let lastUpdateTime = 0;
    const updateInterval = 10000; // 10 seconds

    // Listen for presence changes to update viewer count
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const uniqueViewers = Object.keys(state).length;
      console.log(`Presence sync: detected ${uniqueViewers} viewers`);

      // Update local state
      setViewerCount(Math.max(1, uniqueViewers));

      // Throttle database updates (only update every 10 seconds max)
      const now = Date.now();
      if (now - lastUpdateTime > updateInterval) {
        updateViewerCountInDatabase(Math.max(1, uniqueViewers));
        lastUpdateTime = now;
      }
    });

    // Clean up channel subscription when component unmounts
    return () => {
      console.log(`Cleaning up presence tracking for: ${viewerId}`);
      supabase.removeChannel(presenceChannel);
    };
  }, [streamId, updateViewerCountInDatabase]);

  if (!stream) return null;

  return (
    <div className="py-2 border-b border-border/40 mb-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{stream.title}</h1>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span data-testid="viewer-count">
              {formatViewerCount(debouncedViewerCount)} watching
            </span>
          </div>
        </div>

        {stream.description && <p className="text-muted-foreground">{stream.description}</p>}
      </div>
    </div>
  );
};
