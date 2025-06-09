import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useCommentsSubscription = (
  streamId: string | undefined,
  userId: string,
  refetchComments: () => Promise<void>
) => {
  const channelRef = useRef<any>(null);
  const queryClient = useQueryClient();
  const realtimeEventsReceivedRef = useRef<Set<string>>(new Set());

  // Set up better comment subscription with reconnection handling
  useEffect(() => {
    if (!streamId || streamId === 'new') return;

    console.log(`Setting up realtime subscription for comments in stream ${streamId}`);

    // Create unique channel with more reliable naming
    const uniqueChannelId = `comments-channel-${streamId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const setupChannel = () => {
      // Clean up any existing channel before creating a new one
      if (channelRef.current) {
        console.log(`Cleaning up previous comment subscription for stream ${streamId}`);
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(uniqueChannelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `stream_id=eq.${streamId}`,
          },
          payload => {
            console.log('Comment change detected:', payload.eventType, 'for stream:', streamId);

            // Type guard to check if payload.new exists and has an id property
            const hasNewId = payload.new && typeof payload.new === 'object' && 'id' in payload.new;
            const newId = hasNewId ? (payload.new as { id: string }).id : null;

            // Skip if we've already processed this event
            if (newId && realtimeEventsReceivedRef.current.has(newId)) {
              console.log(`Already processed event for comment ID ${newId}, skipping`);
              return;
            }

            // Handle different event types
            if (payload.eventType === 'INSERT') {
              console.log('New comment inserted:', payload.new);

              // Mark this event as processed if it has an id
              if (newId) {
                realtimeEventsReceivedRef.current.add(newId);
              }

              // If the comment is from the current user, make sure it's displayed immediately
              const isFromCurrentUser =
                hasNewId &&
                typeof (payload.new as { user_id?: string }).user_id === 'string' &&
                (payload.new as { user_id: string }).user_id === userId;

              // If comment is from system (bet notice), force refresh immediately
              const isSystemComment =
                hasNewId &&
                typeof (payload.new as { user_id?: string }).user_id === 'string' &&
                ((payload.new as { user_id: string }).user_id === 'system' ||
                  (payload.new as { user_id: string }).user_id === null);

              if (isFromCurrentUser || isSystemComment) {
                console.log('Immediate refresh for user or system comment');
                queryClient.invalidateQueries({
                  queryKey: ['comments', streamId],
                  refetchType: 'all',
                });

                // Force refetch
                refetchComments();
              } else {
                // For other users' comments, debounce slightly to prevent too many refreshes
                setTimeout(() => {
                  queryClient.invalidateQueries({
                    queryKey: ['comments', streamId],
                    refetchType: 'all',
                  });
                }, 300);
              }
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              // Handle updates and deletes
              setTimeout(() => {
                queryClient.invalidateQueries({
                  queryKey: ['comments', streamId],
                  refetchType: 'all',
                });
              }, 300);
            }
          }
        )
        .subscribe(status => {
          console.log(`Comment subscription status for stream ${streamId}:`, status);
          if (status === 'SUBSCRIBED') {
            console.log(`Successfully subscribed to comments for stream ${streamId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`Error subscribing to comments for stream ${streamId}, will retry`);
            // Attempt to reconnect after a delay
            setTimeout(setupChannel, 3000);
          }
        });

      channelRef.current = channel;
    };

    // Initial setup
    setupChannel();

    // Clean up subscription on unmount
    return () => {
      console.log(`Cleaning up comment subscription for stream ${streamId}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [streamId, queryClient, userId, refetchComments]);

  // Clean up the processed events set periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Keep the set from growing too large over time
      if (realtimeEventsReceivedRef.current.size > 1000) {
        console.log('Clearing processed events set');
        realtimeEventsReceivedRef.current.clear();
      }
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    realtimeEventsReceivedRef,
  };
};
