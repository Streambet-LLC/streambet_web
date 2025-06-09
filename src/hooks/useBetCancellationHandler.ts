import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useBetCancellationHandler = (
  userId: string | null | undefined,
  streamId: string,
  handleBetCancelled: () => void,
  cancellationRef: React.MutableRefObject<boolean>,
  resetToDefaults: () => void
) => {
  const queryClient = useQueryClient();
  const cancelInProgressRef = useRef(false);

  const handleBetCancelledCallback = () => {
    console.log('🚨 Bet cancellation callback triggered in BettingInterface');

    // Prevent multiple cancellations running simultaneously
    if (cancelInProgressRef.current) {
      console.log('Cancellation already in progress, ignoring duplicate callback');
      return;
    }

    // Set cancellation flags to true immediately
    cancelInProgressRef.current = true;

    if (cancellationRef) {
      cancellationRef.current = true;
    }

    // NUCLEAR OPTION: Completely remove ALL existing bet data from cache
    if (userId) {
      console.log('🧨 COMPLETELY CLEARING ALL CACHED BET DATA');

      // First, cancel any in-flight queries
      queryClient.cancelQueries({
        queryKey: ['existing-bet', userId, streamId],
      });

      // Remove queries completely
      queryClient.removeQueries({
        queryKey: ['existing-bet', userId, streamId],
      });

      // Set the cache data to null explicitly
      queryClient.setQueryData(['existing-bet', userId, streamId], null);

      // Temporarily disable refetching
      queryClient.setQueryDefaults(['existing-bet', userId, streamId], {
        enabled: false,
        staleTime: Infinity,
      });
    }

    // Force refresh related queries immediately
    queryClient.invalidateQueries({
      queryKey: ['stream-total-bets', streamId],
    });

    if (userId) {
      queryClient.invalidateQueries({
        queryKey: ['profile', userId],
      });
    }

    // First reset state to default values
    resetToDefaults();

    // Then call parent handler to update UI
    handleBetCancelled();

    // Set a sequence of timers to ensure everything resets properly
    setTimeout(() => {
      console.log('First timeout: Clearing initial cancellation flag');

      // Refresh total pot again
      queryClient.invalidateQueries({
        queryKey: ['stream-total-bets', streamId],
      });

      // Re-enable queries after slight delay
      if (userId) {
        setTimeout(() => {
          console.log('Second timeout: Re-enabling queries');
          queryClient.setQueryDefaults(['existing-bet', userId, streamId], {
            enabled: true,
            staleTime: 0,
          });

          // Then, clear cancellation flags
          setTimeout(() => {
            console.log('Final timeout: Clearing all cancellation flags');
            cancelInProgressRef.current = false;

            if (cancellationRef) {
              cancellationRef.current = false;
            }

            // Final refetch to ensure fresh data
            queryClient.refetchQueries({
              queryKey: ['existing-bet', userId, streamId],
            });

            queryClient.refetchQueries({
              queryKey: ['stream-total-bets', streamId],
            });
          }, 1000);
        }, 1000);
      } else {
        // If no userId, just clear flags after a delay
        setTimeout(() => {
          cancelInProgressRef.current = false;
          if (cancellationRef) {
            cancellationRef.current = false;
          }
        }, 1000);
      }
    }, 500);
  };

  return { handleBetCancelledCallback };
};
