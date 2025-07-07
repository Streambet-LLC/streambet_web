import { useState, useEffect } from 'react';
import { useBettingStateManager } from '@/hooks/useBettingStateManager';
import { BettingInterfaceView } from './BettingInterfaceView';
import { useUserChangeHandler } from '@/hooks/useUserChangeHandler';
import { useStreamStateHandler } from '@/hooks/useStreamStateHandler';
import { useBetPlacementHandler } from '@/hooks/useBetPlacementHandler';
import { useQueryInvalidation } from '@/hooks/useQueryInvalidation';
import { useBetCancellationHandler } from '@/hooks/useBetCancellationHandler';
import { useQueryClient } from '@tanstack/react-query';

interface BettingInterfaceContainerProps {
  session: any;
  stream: any;
  streamId: string;
  pendingBetsKey?: string;
}

export const BettingInterfaceContainer = ({
  session,
  stream,
  streamId,
  pendingBetsKey,
}: BettingInterfaceContainerProps) => {
  const userId = session?.id;
  const [forceRefresh, setForceRefresh] = useState(0);
  const queryClient = useQueryClient();

  // Initialize betting state manager
  const {
    betAmount,
    setBetAmount,
    selectedOption,
    setSelectedOption,
    isPlacingBet,
    profile,
    existingBet,
    placeBet,
    refetchBet,
    resetToDefaults,
    betWasCancelled,
    setBetWasCancelled,
    handleBetCancelled,
    cancellationRef,
  } = useBettingStateManager(userId || '', streamId, pendingBetsKey);

  // Handle user changes
  const { cancelInProgressRef } = useUserChangeHandler(userId, streamId, resetToDefaults);

  // Handle stream state changes (locking, outcome)
  useStreamStateHandler(stream, userId, refetchBet);

  // Handle query invalidation
  useQueryInvalidation(userId, streamId, forceRefresh);

  // Handle bet placement
  const { handlePlaceBet } = useBetPlacementHandler(streamId, placeBet);

  // Handle bet cancellation
  const { handleBetCancelledCallback } = useBetCancellationHandler(
    userId,
    streamId,
    handleBetCancelled,
    cancellationRef,
    resetToDefaults
  );

  // Force refresh existing bet data with reduced frequency
  useEffect(() => {
    if (!userId || !streamId) return;

    // We're implementing very aggressive rate limiting for this effect
    // to reduce the load on the database
    const REFRESH_INTERVAL = 30000; // 30 seconds

    // Create a unique refresh key for this component instance
    const refreshKey = `refreshTimer-${streamId}-${userId}-${forceRefresh}`;

    console.log(`Setting up refresh timer ${refreshKey} with ${REFRESH_INTERVAL}ms interval`);

    const refreshTimer = setInterval(() => {
      console.log(`Timer ${refreshKey} triggered refresh at ${new Date().toISOString()}`);

      // First check if the query is already running
      if (
        queryClient.getQueryState(['existing-bet', userId, streamId])?.fetchStatus === 'fetching'
      ) {
        console.log('Query is already in progress, skipping refresh');
        return;
      }

      queryClient.refetchQueries({
        queryKey: ['existing-bet', userId, streamId],
      });
    }, REFRESH_INTERVAL);

    return () => {
      console.log(`Cleaning up refresh timer ${refreshKey}`);
      clearInterval(refreshTimer);
    };
  }, [userId, streamId, queryClient, refetchBet, forceRefresh]);

  // Force periodic UI refresh with even lower frequency
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      setForceRefresh(prev => prev + 1);
    }, 60000); // Every 60 seconds

    return () => clearInterval(refreshTimer);
  }, []);

  return (
    <BettingInterfaceView
      session={session}
      stream={stream}
      streamId={streamId}
      betAmount={betAmount}
      selectedOption={selectedOption}
      isPlacingBet={isPlacingBet}
      existingBet={existingBet && !cancellationRef.current ? existingBet : null}
      profile={profile}
      forceRefresh={forceRefresh}
      betWasCancelled={betWasCancelled}
      onBetAmountChange={setBetAmount}
      onOptionSelect={setSelectedOption}
      onPlaceBet={() => handlePlaceBet(profile)}
      onBetCancelled={handleBetCancelledCallback}
    />
  );
};
