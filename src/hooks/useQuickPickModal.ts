import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBettingContext } from '@/contexts/BettingContext';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { CurrencyType } from '@/enums';

/**
 * Custom hook to manage QuickPickModal state and actions
 * Handles view switching and betting actions with network error handling
 */
export const useQuickPickModal = () => {
  const { toast } = useToast();
  const { currency } = useCurrencyContext();
  
  const {
    activeRound,
    userBet,
    isLoading,
    setIsLoading,
    isEditing,
    setIsEditing,
    resetKey,
    refetchRoundData,
    placeBet,
    editBet,
    cancelBet,
  } = useBettingContext();

  // Derive computed values
  const showBetTokens = !userBet.betId || isEditing;
  const isSweep = currency === CurrencyType.SWEEP_COINS;
  const totalPot = isSweep ? activeRound.totalSweepCoins : activeRound.totalGoldCoins;
  const updatedSliderMax = {
    goldCoins: activeRound.walletGoldCoin,
    sweepCoins: activeRound.walletSweepCoin,
  };
  const hasActiveBetting = activeRound.bettingVariables && activeRound.bettingVariables.length > 0;

  // Place bet - errors handled by socket event handlers
  const handlePlaceBet = useCallback(
    (bettingVariableId: string, amount: number, currencyType: string) => {
      placeBet(bettingVariableId, amount, currencyType);
    },
    [placeBet]
  );

  // Edit bet - errors handled by socket event handlers
  const handleEditBet = useCallback(
    (betId: string, newBettingVariableId: string, newAmount: number, newCurrencyType: string) => {
      editBet(betId, newBettingVariableId, newAmount, newCurrencyType);
    },
    [editBet]
  );

  // Cancel bet - errors handled by socket event handlers
  const handleCancelBet = useCallback(
    (betId: string, currencyType: string) => {
      cancelBet(betId, currencyType);
    },
    [cancelBet]
  );

  // Start editing a bet
  const handleStartEdit = useCallback(() => {
    setIsLoading(false);
    setIsEditing(true);
    refetchRoundData();
  }, [refetchRoundData, setIsLoading, setIsEditing]);

  // Cancel editing and go back
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, [setIsEditing]);

  return {
    // State
    activeRound,
    userBet,
    isLoading,
    isEditing,
    resetKey,
    showBetTokens,
    // Computed values
    totalPot,
    updatedSliderMax,
    hasActiveBetting,
    // Actions
    handlePlaceBet,
    handleEditBet,
    handleCancelBet,
    handleStartEdit,
    handleCancelEdit,
  };
};
