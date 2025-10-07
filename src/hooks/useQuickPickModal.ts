import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBettingContext } from '@/contexts/BettingContext';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getConnectionErrorMessage } from '@/utils/helper';

/**
 * Custom hook to manage QuickPickModal state and actions
 * Handles view switching, error handling, and betting actions
 */
export const useQuickPickModal = () => {
  const { toast } = useToast();
  const { socketConnect } = useBettingStatusContext();
  const { isConnected: isNetworkConnected } = useNetworkStatus();
  
  const {
    activeRound,
    userBet,
    isLoading,
    updatedBalance,
    isEditing,
    setIsEditing,
    setIsLoading,
    resetKey,
    refetchRoundData,
    placeBet,
    editBet,
    cancelBet,
  } = useBettingContext();

  // Local UI state for view switching
  const [showBetTokens, setShowBetTokens] = useState(true);

  // Sync view state with userBet
  useEffect(() => {
    if (userBet.betId && !isEditing) {
      setShowBetTokens(false); // Show LockTokens
    } else {
      setShowBetTokens(true); // Show BetTokens
    }
  }, [userBet.betId, isEditing, resetKey]);

  // Place bet with connection checking
  const handlePlaceBet = useCallback(
    (bettingVariableId: string, amount: number, currencyType: string) => {
      if (socketConnect && socketConnect.connected) {
        placeBet(bettingVariableId, amount, currencyType);
        setShowBetTokens(false);
      } else {
        toast({
          description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    },
    [socketConnect, placeBet, toast, isNetworkConnected, setIsLoading]
  );

  // Edit bet with connection checking
  const handleEditBet = useCallback(
    (betId: string, newBettingVariableId: string, newAmount: number, newCurrencyType: string) => {
      if (socketConnect && socketConnect.connected) {
        editBet(betId, newBettingVariableId, newAmount, newCurrencyType);
        // Don't set view here - let the socket event handler set isEditing=false after response
        // The useEffect watching isEditing will then switch the view with updated data
      } else {
        toast({
          description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    },
    [socketConnect, editBet, toast, isNetworkConnected, setIsLoading]
  );

  // Cancel bet with connection checking
  const handleCancelBet = useCallback(
    (betId: string, currencyType: string) => {
      if (socketConnect && socketConnect.connected) {
        cancelBet(betId, currencyType);
        setShowBetTokens(true);
      } else {
        toast({
          description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
          variant: 'destructive',
        });
      }
    },
    [socketConnect, cancelBet, toast, isNetworkConnected]
  );

  // Start editing a bet
  const handleStartEdit = useCallback(() => {
    setIsLoading(false);
    setIsEditing(true);
    setShowBetTokens(true);
    refetchRoundData();
  }, [refetchRoundData, setIsLoading, setIsEditing]);

  // Cancel editing and go back
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setShowBetTokens(false);
  }, [setIsEditing]);

  return {
    // State
    activeRound,
    userBet,
    isLoading,
    updatedBalance,
    isEditing,
    resetKey,
    showBetTokens,
    // Actions
    handlePlaceBet,
    handleEditBet,
    handleCancelBet,
    handleStartEdit,
    handleCancelEdit,
  };
};
