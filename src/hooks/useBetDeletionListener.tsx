import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useBetDeletionListener = (streamId: string, userId?: string) => {
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);

  // Set up a special channel for GLOBAL bet deletions
  useEffect(() => {
    if (!streamId) return;

    const betGlobalChannelName = `bet_deletion_global_${streamId}_${Date.now()}`;
    console.log('Setting up global bet deletion channel:', betGlobalChannelName);

    const betGlobalChannel = supabase
      .channel(betGlobalChannelName)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'stream_bets',
          filter: `stream_id=eq.${streamId}`,
        },
        payload => {
          console.log('Global bet DELETION detected on stream page:', payload);

          // Force a complete refresh of all betting-related queries
          queryClient.invalidateQueries({
            queryKey: ['stream-total-bets', streamId],
            refetchType: 'all',
          });

          // Force full refresh of UI by updating the refresh key
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up global bet deletion channel');
      supabase.removeChannel(betGlobalChannel);
    };
  }, [streamId, queryClient]);

  // Add a user-specific bet deletion channel
  useEffect(() => {
    if (!streamId || !userId) return;

    const userBetChannelName = `bet_deletion_user_${userId}_${streamId}_${Date.now()}`;
    console.log('Setting up user-specific bet deletion channel:', userBetChannelName);

    const userBetChannel = supabase
      .channel(userBetChannelName)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'stream_bets',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          console.log('User-specific bet DELETION detected:', payload);

          // Remove existing queries completely
          queryClient.removeQueries({
            queryKey: ['existing-bet', userId, streamId],
          });

          // Then invalidate related queries
          queryClient.invalidateQueries({
            queryKey: ['profile', userId],
            refetchType: 'all',
          });

          // Force full UI refresh
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up user-specific bet deletion channel');
      supabase.removeChannel(userBetChannel);
    };
  }, [streamId, userId, queryClient]);

  return { refreshKey };
};
