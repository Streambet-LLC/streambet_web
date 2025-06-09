import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useBettingCore } from './useBettingCore';
import { useBetCancellation } from './useBetCancellation';
import { useProfileData } from './useProfileData';
import { useExistingBet } from './useExistingBet';
import { useBetPlacement } from './useBetPlacement';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/integrations/api/client';
import { useAutoReload } from './useAutoReload';

export const useBettingStateManager = (
  userId: string,
  streamId: string,
  pendingBetsKey?: string
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // We need to create the cancellationRef here so it can be returned from this hook
  const cancellationRef = useRef(false);

  // This ref helps us track if we've seen the state reset by the admin
  const stateResetRef = useRef(false);
  const lastBettingOutcomeRef = useRef<string | null>(null);

  // Get user profile
  const { profile } = useProfileData(userId);

  // Core betting state (amount, option, editing state)
  const {
    betAmount,
    selectedOption,
    isPlacingBet,
    setBetAmount,
    setSelectedOption,
    setIsPlacingBet,
    resetToDefaults,
  } = useBettingCore(profile?.wallet_balance, null);

  // Bet cancellation
  const { betWasCancelled, setBetWasCancelled, handleBetCancelled } = useBetCancellation(
    userId,
    streamId,
    resetToDefaults,
    cancellationRef
  );

  // Get existing bet with the optional pendingBetsKey for cache separation
  const { existingBet, refetchBet, isExistingBetLoading } = useExistingBet(
    userId,
    streamId,
    cancellationRef
  );

  // Bet placement
  const { placeBet: placeBetHandler } = useBetPlacement(userId, streamId, refetchBet);

  const { checkAutoReloadForBet, isAutoReloading } = useAutoReload();

  // Stream state updates subscription
  useEffect(() => {
    if (!streamId) return;

    // Use the socket API to listen for betting state changes
    const socket = api.socket.connect();
    if (!socket) return;

    // Join the stream room
    api.socket.joinStream(streamId);

    // Listen for betting updates
    api.socket.onBettingUpdate(data => {
      if (data.streamId === streamId) {
        console.log('Stream betting update detected:', data);

        // Check if betting state has been reset
        if (lastBettingOutcomeRef.current && !data.bettingOutcome) {
          console.log('Admin state reset detected - clearing betting state');
          stateResetRef.current = true;

          // Force clear any cached data
          queryClient.removeQueries({ queryKey: ['existing-bet', userId, streamId] });

          // Force bet cancellation to reset the UI
          setBetWasCancelled(true);
          resetToDefaults();

          setTimeout(() => {
            refetchBet();
          }, 1000);
        }

        // Update our reference
        lastBettingOutcomeRef.current = data.bettingOutcome;
      }
    });

    return () => {
      // Leave the stream room
      api.socket.leaveStream(streamId);
    };
  }, [streamId, userId, queryClient, setBetWasCancelled, resetToDefaults, refetchBet]);

  // Update form when existingBet changes
  useEffect(() => {
    try {
      if (cancellationRef.current) {
        console.log('Cancellation in progress, skipping form update from existingBet');
        return;
      }

      if (betWasCancelled) {
        console.log('Bet was cancelled, state will remain in default form state');
        return;
      }

      if (stateResetRef.current) {
        console.log('Admin reset detected, keeping form in reset state');
        stateResetRef.current = false;
        return;
      }

      if (!existingBet) {
        console.log('No existing bet found, resetting to defaults');
        resetToDefaults();
      }
    } catch (error) {
      console.error('Error handling bet state update:', error);
      toast({
        title: 'Error',
        description: 'There was an issue updating your betting interface. Please refresh the page.',
        variant: 'destructive',
      });
    }
  }, [existingBet, resetToDefaults, betWasCancelled, toast]);

  // Listen for bet updates using socket
  useEffect(() => {
    if (!userId || !streamId) {
      return;
    }

    console.log('Setting up bet update listener for user:', userId, 'and stream:', streamId);

    // Connect to socket
    const socket = api.socket.connect();
    if (!socket) return;

    // Join the stream room
    api.socket.joinStream(streamId);

    // Listen for betting updates
    api.socket.onBettingUpdate(data => {
      if (data.streamId === streamId) {
        console.log('Bet state change detected:', data);

        // Use a single handler for all bet-related events to reduce code duplication
        const updateBetState = () => {
          // Force refresh the UI but don't invalidate to reduce API calls
          queryClient.refetchQueries({
            queryKey: ['existing-bet', userId, streamId],
          });

          // Also refresh total bets
          queryClient.refetchQueries({
            queryKey: ['stream-total-bets', streamId],
          });
        };

        // Add a delay to prevent immediate hammering
        setTimeout(updateBetState, 1000);

        // For DELETE events, we need special handling
        if (data.eventType === 'DELETE') {
          setBetWasCancelled(true);
          resetToDefaults();
        }
      }
    });

    return () => {
      // Leave the stream room
      api.socket.leaveStream(streamId);
    };
  }, [userId, streamId, queryClient, refetchBet, setBetWasCancelled, resetToDefaults]);

  // Mutation to place a bet
  const placeBetMutation = useMutation({
    mutationFn: async (betData: {
      streamId: string;
      bettingVariableId: string;
      amount: number;
      option: string;
    }) => {
      return api.betting.placeBet(betData);
    },
    onSuccess: () => {
      toast({
        title: 'Bet Placed',
        description: `Your bet of ${betAmount} coins has been placed successfully.`,
      });

      // Reset bet amount and selection
      setBetAmount(10);
      setSelectedOption('');

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['existing-bet', userId, streamId] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Bet Failed',
        description: error.message || 'Failed to place bet. Please try again.',
      });
    },
  });

  // Function to place a bet with auto-reload check
  const placeBet = async (bettingVariableId: string, option: string) => {
    try {
      setIsPlacingBet(true);

      // Check if we need auto-reload
      const walletBalance = profile?.wallet_balance || 0;
      if (walletBalance < betAmount) {
        const reloaded = await checkAutoReloadForBet(betAmount);

        // If auto-reload failed and we still don't have enough, show error
        if (!reloaded && (profile?.wallet_balance || 0) < betAmount) {
          toast({
            variant: 'destructive',
            title: 'Insufficient Balance',
            description: "You don't have enough coins to place this bet.",
          });
          setIsPlacingBet(false);
          return;
        }
      }

      // Place the bet
      await placeBetMutation.mutateAsync({
        streamId,
        bettingVariableId,
        amount: betAmount,
        option,
      });
    } catch (error) {
      console.error('Error placing bet:', error);
    } finally {
      setIsPlacingBet(false);
    }
  };

  return {
    betAmount,
    setBetAmount,
    selectedOption,
    setSelectedOption,
    isPlacingBet: isPlacingBet || isAutoReloading,
    profile,
    existingBet,
    placeBet,
    refetchBet,
    resetToDefaults,
    betWasCancelled,
    setBetWasCancelled,
    handleBetCancelled,
    cancellationRef,
    isExistingBetLoading,
  };
};
