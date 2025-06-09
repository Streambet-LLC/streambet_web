import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { api } from '@/integrations/api/client';

export const useExistingBet = (
  userId: string,
  streamId: string,
  cancellationRef: MutableRefObject<boolean>
) => {
  const queryClient = useQueryClient();
  const [networkErrorCount, setNetworkErrorCount] = useState(0);
  const lastGoodDataRef = useRef<any>(null);
  const fetchCountRef = useRef(0);

  // Force disable query when cancellation is active
  useEffect(() => {
    if (cancellationRef.current) {
      console.log('🚨 CRITICAL: Cancellation active, completely disabling existing bet query');
      queryClient.cancelQueries({ queryKey: ['existing-bet', userId, streamId] });
      queryClient.setQueryData(['existing-bet', userId, streamId], null);
      queryClient.setQueryDefaults(['existing-bet', userId, streamId], {
        enabled: false,
      });
    }
  }, [cancellationRef.current, userId, streamId, queryClient]);

  // Super aggressive cancellation check in query
  const {
    data: existingBet,
    refetch: refetchBet,
    isLoading: isExistingBetLoading,
    fetchStatus,
  } = useQuery({
    queryKey: ['existing-bet', userId, streamId],
    enabled: !!userId && !!streamId && !cancellationRef.current,
    queryFn: async () => {
      // Track fetch count to identify potential infinite loops
      fetchCountRef.current += 1;
      if (fetchCountRef.current > 20) {
        console.warn('Too many fetches in a short period, using cached data if available');
        fetchCountRef.current = 0; // Reset counter
        if (lastGoodDataRef.current !== null) {
          return lastGoodDataRef.current;
        }
      }

      // CRITICAL SAFETY CHECK: Immediately return null during cancellation
      if (cancellationRef.current) {
        console.log('🛑 FORCED NULL: Cancellation flag is active during queryFn execution');
        return null;
      }

      if (!userId || !streamId) {
        console.log('Missing userId or streamId for fetching bet');
        return null;
      }

      console.log('Fetching existing bet for user:', userId, 'and stream:', streamId);

      try {
        // Get active bets from the API
        const bets = await api.betting.getUserBets(true);

        // Find the bet for this stream
        const bet = bets.find(bet => bet.streamId === streamId);

        // Reset network error count on successful fetch
        if (networkErrorCount > 0) {
          setNetworkErrorCount(0);
        }

        // Double check cancellation flag before returning data
        if (cancellationRef.current) {
          console.log('🛑 Cancellation activated during fetch, forcing null return');
          return null;
        }

        console.log('Existing bet query returned:', bet || 'null');

        // Store as last good data if non-null
        if (bet) {
          lastGoodDataRef.current = bet;
        }

        return bet || null;
      } catch (error) {
        console.error('Unexpected error in useExistingBet:', error);

        // Check for resource error
        if (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('network') ||
          error.message?.includes('ERR_INSUFFICIENT_RESOURCES')
        ) {
          setNetworkErrorCount(prev => prev + 1);

          // If we've had multiple network errors, use cached data or null
          if (networkErrorCount > 0) {
            console.log('Multiple resource errors, returning cached data if available');
            return lastGoodDataRef.current;
          }
        }

        // On error, use last good data if available
        if (lastGoodDataRef.current !== null) {
          console.log('Using cached bet data due to error');
          return lastGoodDataRef.current;
        }

        return null;
      }
    },
    // Improve caching behavior and retry logic
    staleTime: 5000, // Longer stale time to reduce fetch frequency
    refetchInterval: networkErrorCount > 0 ? 15000 : 10000, // Back off significantly on errors
    retry: 1, // Reduce retry count to avoid hammering API
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    gcTime: 0,
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Add an effect to recover from persistent network errors
  useEffect(() => {
    if (networkErrorCount > 3) {
      console.log('Detected persistent network errors, scheduling recovery...');

      const recoveryTimeout = setTimeout(() => {
        console.log('Running recovery for network errors');
        setNetworkErrorCount(0);
        fetchCountRef.current = 0;
        queryClient.invalidateQueries({ queryKey: ['existing-bet', userId, streamId] });
        refetchBet();
      }, 30000); // Wait 30 seconds before trying a full recovery

      return () => clearTimeout(recoveryTimeout);
    }
  }, [networkErrorCount, userId, streamId, queryClient, refetchBet]);

  // Return null during cancellation regardless of what the query returned
  return {
    existingBet: cancellationRef.current ? null : existingBet,
    refetchBet,
    isExistingBetLoading,
    fetchStatus,
  };
};
