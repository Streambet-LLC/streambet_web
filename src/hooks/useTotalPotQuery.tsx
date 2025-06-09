import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useEffect } from 'react';

export const useTotalPotQuery = (streamId: string, initialTotalBets: number = 0) => {
  const [lastSuccessfulValue, setLastSuccessfulValue] = useState<number>(initialTotalBets);
  const requestTimeRef = useRef<number>(0);
  const failureCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useQuery({
    queryKey: ['stream-total-bets', streamId],
    queryFn: async () => {
      if (!streamId) {
        console.error('No streamId provided to useTotalPotQuery hook');
        return lastSuccessfulValue;
      }

      // Check if we've made a request too recently
      const now = Date.now();
      if (now - requestTimeRef.current < 5000) {
        // 5 second minimum between requests
        console.log('Rate limiting total bets query, returning cached value');
        return lastSuccessfulValue;
      }

      requestTimeRef.current = now;
      console.log('Fetching total bets for stream:', streamId);

      try {
        // First, try to get the value from the streams table for efficiency
        const { data: streamData, error: streamError } = await supabase
          .from('streams')
          .select('total_bets')
          .eq('id', streamId)
          .single();

        if (!streamError && streamData && typeof streamData.total_bets === 'number') {
          // Update our cache with the successful value
          if (isMountedRef.current) {
            setLastSuccessfulValue(streamData.total_bets);
            failureCountRef.current = 0; // Reset failure count on success
          }
          return streamData.total_bets;
        }

        // If rate limited or failed, use cached value
        if (failureCountRef.current > 0) {
          failureCountRef.current++;
          console.log(
            `Using cached total_bets due to ${failureCountRef.current} consecutive failures`
          );
          return lastSuccessfulValue;
        }

        // If that failed, calculate from bets table
        const { data: betsData, error: betsError } = await supabase
          .from('stream_bets')
          .select('amount, status')
          .eq('stream_id', streamId)
          .eq('status', 'pending');

        if (betsError) {
          console.error('Error fetching bets for sum calculation:', betsError);
          failureCountRef.current++;

          // Return last known good value
          return lastSuccessfulValue;
        }

        // Calculate sum of all active pending bets
        const calculatedSum =
          betsData?.reduce((sum, bet) => {
            // Only include pending bets in the total
            if (bet.status === 'pending') {
              return sum + (Number(bet.amount) || 0);
            }
            return sum;
          }, 0) || 0;

        console.log(
          'Calculated sum from all bets:',
          calculatedSum,
          'based on',
          betsData?.filter(bet => bet.status === 'pending').length || 0,
          'pending bets'
        );

        // Log individual bets for debugging
        console.log(
          'Individual bets:',
          betsData?.map(bet => ({
            amount: bet.amount,
            status: bet.status,
          }))
        );

        // Cache the successful value
        if (isMountedRef.current) {
          setLastSuccessfulValue(calculatedSum);
          failureCountRef.current = 0; // Reset failure count on success
        }

        // Update the streams table only if we have low failure count
        // to reduce unnecessary API operations
        try {
          if (calculatedSum >= 0 && failureCountRef.current === 0) {
            const { error: updateError } = await supabase
              .from('streams')
              .update({ total_bets: calculatedSum })
              .eq('id', streamId);

            if (updateError) {
              console.error('Failed to update streams.total_bets:', updateError);
            } else {
              console.log('Updated streams.total_bets to match calculated sum:', calculatedSum);
            }
          }
        } catch (updateErr) {
          console.warn('Error updating total_bets in streams table:', updateErr);
          // Non-critical error, we can continue
        }

        return calculatedSum;
      } catch (err) {
        console.error('Unexpected error in useTotalPotQuery:', err);
        failureCountRef.current++;
        return lastSuccessfulValue;
      }
    },
    enabled: !!streamId,
    refetchOnMount: true,
    staleTime: 10000, // Increase stale time to 10 seconds
    refetchInterval: 20000, // Decrease refresh frequency to 20 seconds
    retry: 1, // Reduce retry count
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: true,
    gcTime: 60000, // Keep data for 1 minute
  });
};
