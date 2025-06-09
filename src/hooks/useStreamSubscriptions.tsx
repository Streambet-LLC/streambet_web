import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useStreamSubscriptions = (streamId: string, refetch: () => void) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!streamId) {
      console.error('No stream ID available for subscriptions');
      return;
    }

    console.log('Setting up global realtime subscription for stream page:', streamId);

    // Create a stable channel name that won't change between renders
    const channelName = `stream_page_${streamId}`;

    // Create a debounced refetch function to prevent excessive refreshes
    let debounceTimer: NodeJS.Timeout | null = null;
    const debouncedRefetch = (delay: number = 300) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        console.log('Debounced stream refetch triggered');
        refetch();
      }, delay);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${streamId}`,
        },
        payload => {
          console.log('Stream page update received:', payload);
          debouncedRefetch();
        }
      )
      .subscribe(status => {
        console.log(`Stream subscription status: ${status}`);
      });

    return () => {
      console.log('Cleaning up stream page subscription');
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [streamId, refetch, queryClient]);
};
