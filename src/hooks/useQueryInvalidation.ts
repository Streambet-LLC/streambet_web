import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useQueryInvalidation = (
  userId: string | null | undefined,
  streamId: string,
  forceRefresh: number
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userId) {
      console.log('User changed or component mounted with user:', userId);

      queryClient.invalidateQueries({
        queryKey: ['existing-bet'],
      });

      queryClient.invalidateQueries({
        queryKey: ['profile', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['stream-total-bets', streamId],
      });
    }
  }, [userId, streamId, queryClient, forceRefresh]);
};
