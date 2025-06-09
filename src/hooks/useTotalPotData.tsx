import { useEffect, useState, useCallback, useRef } from 'react';
import { useUserBetData } from './useUserBetData';
import { useTotalPotQuery } from './useTotalPotQuery';
import { useBetRealtimeSubscription } from './useBetRealtimeSubscription';

export const useTotalPotData = (streamId: string, initialTotalBets: number = 0) => {
  const [localTotal, setLocalTotal] = useState<number | null>(null);
  const previousTotalRef = useRef<number | null>(null);
  const lastUserBetRef = useRef<{ amount: number; option: string } | null>(null);

  // Use our specialized hooks
  const { userBet } = useUserBetData(streamId);
  const { data: latestTotalBets, refetch } = useTotalPotQuery(streamId, initialTotalBets);

  // Update lastUserBetRef when userBet changes
  useEffect(() => {
    // Only update if userBet changes from something to null (bet cancelled)
    // or from null to something (bet placed)
    if (lastUserBetRef.current !== null && userBet === null) {
      console.log('User bet was cancelled, clearing lastUserBetRef');
      lastUserBetRef.current = null;
    } else if (userBet !== null) {
      lastUserBetRef.current = userBet;
    }
  }, [userBet]);

  // Callback to update local state, with validation
  const updateLocalTotal = useCallback((newValue: number | null) => {
    if (newValue !== null && !isNaN(newValue) && newValue >= 0) {
      // Only update if value is different from previous
      if (previousTotalRef.current !== newValue) {
        console.log(
          'Setting validated local total to:',
          newValue,
          '(previous was:',
          previousTotalRef.current,
          ')'
        );
        previousTotalRef.current = newValue;
        setLocalTotal(newValue);
      }
    } else {
      console.warn('Ignoring invalid total pot update:', newValue);
    }
  }, []);

  // Set up realtime subscriptions
  useBetRealtimeSubscription(streamId, updateLocalTotal, refetch);

  // Update local state when data changes from query
  useEffect(() => {
    if (latestTotalBets !== undefined && latestTotalBets !== null) {
      updateLocalTotal(latestTotalBets);
    }
  }, [latestTotalBets, updateLocalTotal]);

  // Determine the current total pot with fallbacks
  const currentTotalPot = localTotal !== null ? localTotal : (latestTotalBets ?? initialTotalBets);

  return {
    totalPot: currentTotalPot,
    userBet,
    refetchTotalPot: refetch,
  };
};
