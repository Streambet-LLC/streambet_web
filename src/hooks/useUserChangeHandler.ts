import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useUserChangeHandler = (
  userId: string | null | undefined,
  streamId: string,
  resetToDefaults: () => void
) => {
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null>(null);
  const cancelInProgressRef = useRef(false);

  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      console.log('User changed from', prevUserIdRef.current, 'to', userId);
      prevUserIdRef.current = userId || null;

      cancelInProgressRef.current = false;

      if (prevUserIdRef.current) {
        console.log('Clearing previous user queries');
        queryClient.removeQueries({
          queryKey: ['existing-bet', prevUserIdRef.current],
        });
      }

      resetToDefaults();
    }
  }, [userId, queryClient, resetToDefaults]);

  return { cancelInProgressRef };
};
