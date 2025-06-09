import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface BettingCoreState {
  betAmount: number;
  selectedOption: string;
  isPlacingBet: boolean;
}

export interface BettingCoreActions {
  setBetAmount: (amount: number) => void;
  setSelectedOption: (option: string) => void;
  setIsPlacingBet: (isPlacing: boolean) => void;
  resetToDefaults: () => void;
}

export const useBettingCore = (
  walletBalance: number = 0,
  existingBet: any = null
): BettingCoreState & BettingCoreActions => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get initial bet amount - either existing bet amount or 50% of wallet balance (max 10)
  const getInitialBetAmount = useCallback(() => {
    // Default to 10 or half the wallet balance, whichever is smaller
    return walletBalance > 0 ? Math.min(Math.floor(walletBalance / 2), 10) : 10;
  }, [walletBalance]);

  const [betAmount, setBetAmount] = useState(getInitialBetAmount());
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  // Reset to defaults - with enhanced logging
  const resetToDefaults = useCallback(() => {
    console.log('Resetting betting state to defaults');
    const defaultBetAmount = walletBalance ? Math.min(Math.floor(walletBalance / 2), 10) : 10;

    setBetAmount(defaultBetAmount);
    setSelectedOption('');
  }, [walletBalance]);

  return {
    betAmount,
    selectedOption,
    isPlacingBet,
    setBetAmount,
    setSelectedOption,
    setIsPlacingBet,
    resetToDefaults,
  };
};
