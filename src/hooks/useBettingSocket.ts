import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { useToast } from '@/hooks/use-toast';
import api from '@/integrations/api/client';
import type { ActiveRound, UserBet, BettingVariableStats } from '@/contexts/BettingContext';

interface UseBettingSocketProps {
  socket: any;
  streamId: string | null;
  session: any;
  // Context setters passed from provider to avoid circular dependency
  setActiveRound: React.Dispatch<React.SetStateAction<ActiveRound>>;
  setUserBet: React.Dispatch<React.SetStateAction<UserBet>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setResetKey: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Hook to manage betting socket connections and data fetching
 * Queries are in the hook and update context state via useEffect
 * Receives setters from provider to avoid circular dependency during initialization
 */
export function useBettingSocket({ 
  socket, 
  streamId, 
  session,
  setActiveRound,
  setUserBet,
  setIsLoading,
  setIsEditing,
  setResetKey,
}: UseBettingSocketProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debounce timer ref at hook level
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Query 1: Fetch betting data for the stream
  const { data: bettingData, refetch: refetchBettingData } = useQuery({
    queryKey: ['bettingData', streamId, session?.id],
    queryFn: async () => {
      if (!session?.id || !streamId) return null;
      const resp = await api.betting.getBettingData(streamId, session.id);
      return resp?.data ?? null;
    },
    enabled: !!session?.id && !!streamId,
  });

  // Debounced refetch callback at hook level
  const debouncedRefetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      refetchBettingData();
    }, 500);
  }, [refetchBettingData]);

  // Update activeRound when bettingData changes
  useEffect(() => {
    if (bettingData?.bettingRounds?.[0]) {
      const betRound = bettingData.bettingRounds[0];
      
      // Map betting variables with enhanced statistics
      const enhancedVariables: BettingVariableStats[] = (betRound.bettingVariables || []).map(item => ({
        id: item.id,
        name: item.name,
        optionName: item.name,
        totalBetsGoldCoin: Number(item.totalBetsGoldCoinAmount || 0),
        totalBetsSweepCoin: Number(item.totalBetsSweepCoinAmount || 0),
        betCountGoldCoin: Number(item.betCountGoldCoin || 0),
        betCountSweepCoin: Number(item.betCountSweepCoin || 0),
      }));
      
      // Calculate totals across all betting variables
      const totalBetCountGoldCoin = enhancedVariables.reduce(
        (sum, item) => sum + item.betCountGoldCoin, 0
      );
      
      const totalBetCountSweepCoin = enhancedVariables.reduce(
        (sum, item) => sum + item.betCountSweepCoin, 0
      );
      
      setActiveRound({
        id: betRound.id,
        roundName: betRound.roundName || '',
        status: betRound.status,
        totalGoldCoins: bettingData.roundTotalBetsGoldCoinAmount ?? 0,
        totalSweepCoins: bettingData.roundTotalBetsSweepCoinAmount ?? 0,
        totalBetCountGoldCoin,
        totalBetCountSweepCoin,
        isLocked: betRound.status === BettingRoundStatus.LOCKED,
        bettingVariables: enhancedVariables,
        walletGoldCoin: bettingData.walletGoldCoin,
        walletSweepCoin: bettingData.walletSweepCoin,
        userBetGoldCoins: bettingData.userBetGoldCoins,
        userBetSweepCoin: bettingData.userBetSweepCoin,
      });
    }
  }, [bettingData, setActiveRound]);

  // Query 2: Fetch round data for user's current bet
  const { data: getRoundData, refetch: refetchRoundData } = useQuery({
    queryKey: ['selectedRoundData', bettingData?.bettingRounds?.[0]?.id],
    queryFn: async () => {
      const roundId = bettingData?.bettingRounds?.[0]?.id;
      if (!roundId || !streamId) return null;
      const resp = await api.betting.getBettingRoundData(roundId);
      return resp?.data ?? null;
    },
    enabled: !!bettingData?.id && !!streamId,
  });

  // Update userBet when getRoundData changes
  useEffect(() => {
    if (getRoundData) {
      const isSweep = getRoundData.currencyType === CurrencyType.SWEEP_COINS;
      setUserBet({
        betId: getRoundData.betId,
        amount: getRoundData.betAmount,
        selectedOption: getRoundData.optionName,
        potentialWinnings: isSweep 
          ? getRoundData.potentialSweepCoinAmt 
          : getRoundData.potentialGoldCoinAmt,
        currencyType: getRoundData.currencyType,
        isLocked: getRoundData.status === BettingRoundStatus.LOCKED,
      });
    } else if (getRoundData === null) {
      // No bet data returned, clear the user bet
      setUserBet({
        betId: null,
        amount: 0,
        selectedOption: '',
        potentialWinnings: 0,
        currencyType: undefined,
        isLocked: false,
      });
    }
  }, [getRoundData, setUserBet]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !streamId) return;

    // Join the stream
    socket.emit('joinStream', streamId);

    // Update pot amounts in real-time
    const handleBettingUpdate = (update: any) => {
      // Optimistically update coin amounts immediately
      setActiveRound((prev) => ({
        ...prev,
        totalGoldCoins: update?.totalBetsGoldCoinAmount ?? prev.totalGoldCoins,
        totalSweepCoins: update?.totalBetsSweepCoinAmount ?? prev.totalSweepCoins,
      }));
      
      // Refetch betting data to get updated bet counts
      debouncedRefetch();
      
      setIsLoading(false);
    };

    // Update potential winnings in real-time
    const handlePotentialAmountUpdate = (data: any) => {
      setUserBet((prev) => {
        const isSweep = prev.currencyType === CurrencyType.SWEEP_COINS;
        return {
          ...prev,
          potentialWinnings: isSweep 
            ? data?.potentialSweepCoinWinningAmount 
            : data?.potentialGoldCoinWinningAmount,
        };
      });
    };

    // Lock betting when round is locked
    const handleBettingLocked = (data: any) => {
      setActiveRound((prev) => ({
        ...prev,
        isLocked: data?.lockedStatus ?? true,
      }));
      setUserBet((prev) => ({
        ...prev,
        isLocked: data?.lockedStatus ?? true,
      }));
    };

    // Handle winner declaration
    const handleWinnerDeclared = (data: any) => {
      toast({
        title: 'Round Closed',
        description: `${data?.winnerName} has been selected as winning pick option!`,
        duration: 7000,
      });
      // Refetch queries to get updated data
      refetchBettingData();
      refetchRoundData();
      setResetKey((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['session'] });
    };

    // Handle bet placed successfully
    const handleBetPlaced = (update: any) => {
      if (update?.bet?.userId === session?.id) {
        queryClient.invalidateQueries({ queryKey: ['session'] });
        
        const isSweep = update?.bet?.currencyType === CurrencyType.SWEEP_COINS;
        
        setUserBet({
          betId: update?.bet?.id,
          amount: update?.amount,
          selectedOption: update?.selectedWinner,
          potentialWinnings: isSweep 
            ? update?.potentialSweepCoinWinningAmount 
            : update?.potentialGoldCoinWinningAmount,
          currencyType: update?.bet?.currencyType,
          isLocked: false,
        });
        
        setIsLoading(false);
        
        if (update?.message) {
          toast({ description: update.message });
        }
      }
    };

    // Handle new round opened
    const handleBetOpened = () => {
      toast({ description: 'New pick options available!' });
      refetchBettingData();
      refetchRoundData();
    };

    // Handle bet cancelled by admin
    const handleBetCancelledByAdmin = () => {
      toast({ 
        description: 'Current picking round cancelled by admin.', 
        variant: 'destructive' 
      });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      refetchBettingData();
    };

    // Handle bet cancelled by user
    const handleBetCancelled = (update: any) => {
      if (update?.bet?.userId === session?.id) {
        queryClient.invalidateQueries({ queryKey: ['session'] });
        
        // Reset user bet
        setUserBet({
          betId: null,
          amount: 0,
          selectedOption: '',
          potentialWinnings: 0,
          currencyType: undefined,
          isLocked: false,
        });
        
        // Exit editing mode after successful cancel
        setIsEditing(false);
        
        if (update?.message) {
          toast({ description: update?.message });
        }
        
        refetchBettingData();
        refetchRoundData();
      }
    };

    // Handle bet edited
    const handleBetEdited = (update: any) => {
      if (update?.bet?.userId === session?.id) {
        const isSweep = update?.currencyType === CurrencyType.SWEEP_COINS;
        
        setUserBet({
          betId: update?.bet?.id,
          amount: update?.amount,
          selectedOption: update?.selectedWinner,
          potentialWinnings: isSweep 
            ? update?.potentialSweepCoinWinningAmount 
            : update?.potentialGoldCoinWinningAmount,
          currencyType: update?.currencyType,
          isLocked: false,
        });
        
        // Exit editing mode after successful edit with updated data
        setIsEditing(false);
        setIsLoading(false);
        
        if (update?.message) {
          toast({ description: update.message });
        }
      }
    };

    // Handle errors
    const handleError = (error: any) => {
      toast({
        description: error?.message || 'An error occurred. Please refresh and try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
      
    //   if (error?.isForcedLogout) {
    //     window.dispatchEvent(new CustomEvent('vpnProxyDetected'));
    //   }
    };

    // Register event listeners
    socket.on('bettingUpdate', handleBettingUpdate);
    socket.on('potentialAmountUpdate', handlePotentialAmountUpdate);
    socket.on('bettingLocked', handleBettingLocked);
    socket.on('winnerDeclared', handleWinnerDeclared);
    socket.on('betPlaced', handleBetPlaced);
    socket.on('betOpened', handleBetOpened);
    socket.on('betCancelledByAdmin', handleBetCancelledByAdmin);
    socket.on('betCancelled', handleBetCancelled);
    socket.on('betEdited', handleBetEdited);
    socket.on('error', handleError);

    // Cleanup on unmount
    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      socket.emit('leaveStream', streamId);
      socket.off('bettingUpdate', handleBettingUpdate);
      socket.off('potentialAmountUpdate', handlePotentialAmountUpdate);
      socket.off('bettingLocked', handleBettingLocked);
      socket.off('winnerDeclared', handleWinnerDeclared);
      socket.off('betPlaced', handleBetPlaced);
      socket.off('betOpened', handleBetOpened);
      socket.off('betCancelledByAdmin', handleBetCancelledByAdmin);
      socket.off('betCancelled', handleBetCancelled);
      socket.off('betEdited', handleBetEdited);
      socket.off('error', handleError);
    };
  }, [socket, streamId, session?.id, refetchBettingData, refetchRoundData, toast, queryClient, setActiveRound, setUserBet, setIsLoading, setResetKey, debouncedRefetch]);

  // Return refetch functions so they can be exposed via context
  return { refetchBettingData, refetchRoundData };
}
