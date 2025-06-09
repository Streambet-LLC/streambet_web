import { useState, useCallback, MutableRefObject, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useBetCancellation = (
  userId: string,
  streamId: string,
  resetToDefaults: () => void,
  cancellationRef: MutableRefObject<boolean>
) => {
  const [betWasCancelled, setBetWasCancelled] = useState(false);
  const queryClient = useQueryClient();

  // Ensure cancellation flag is cleared on unmount
  useEffect(() => {
    return () => {
      cancellationRef.current = false;
    };
  }, [cancellationRef]);

  // Much more aggressive cancellation handler
  const handleBetCancelled = useCallback(() => {
    console.log('🚨 CANCELLATION TRIGGERED: Setting UI state and flags immediately');

    // Set flags immediately
    setBetWasCancelled(true);
    cancellationRef.current = true;

    // NUCLEAR OPTION: Completely remove ALL existing bet data from cache
    if (userId && streamId) {
      console.log('🧨 NUCLEAR CACHE CLEARING for user', userId, 'and stream', streamId);

      // First completely remove the queries
      queryClient.removeQueries({ queryKey: ['existing-bet', userId, streamId] });

      // Then set the data to null
      queryClient.setQueryData(['existing-bet', userId, streamId], null);

      // Disable refetching temporarily by setting queryDefaults
      queryClient.setQueryDefaults(['existing-bet', userId, streamId], {
        enabled: false,
        staleTime: Infinity,
        gcTime: 0,
      });

      // Force invalidate all related queries to trigger refetch once cancellation is done
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['stream-total-bets', streamId] });
    }

    // Reset form values immediately
    resetToDefaults();

    // Keep cancellation state active to prevent refetching
    // but clear UI cancellation state after a delay
    setTimeout(() => {
      console.log('Clearing betWasCancelled UI state after delay');
      setBetWasCancelled(false);

      // Keep cancellation flag active longer to prevent race conditions
      setTimeout(() => {
        console.log('Finally clearing cancellation flag, allowing normal operation');
        cancellationRef.current = false;

        // Re-enable queries only after cancellation is fully complete
        if (userId && streamId) {
          queryClient.setQueryDefaults(['existing-bet', userId, streamId], {
            enabled: true,
            staleTime: 0,
            gcTime: 0,
          });
        }
      }, 3000); // Even longer delay
    }, 1000);
  }, [userId, streamId, queryClient, resetToDefaults, cancellationRef]);

  return {
    betWasCancelled,
    setBetWasCancelled,
    handleBetCancelled,
  };
};
