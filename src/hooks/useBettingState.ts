import { useState, useEffect } from 'react';

interface ExistingBet {
  amount: number;
  bet_option: string;
}

export const useBettingState = (initialBalance: number = 0, existingBet?: ExistingBet | null) => {
  // Get initial bet amount - either existing bet amount or 50% of wallet balance (max 10)
  const getInitialBetAmount = () => {
    if (existingBet?.amount) {
      return Math.min(existingBet.amount, initialBalance);
    }

    // Default to 10 or half the wallet balance, whichever is smaller
    return initialBalance > 0 ? Math.min(Math.floor(initialBalance / 2), 10) : 10;
  };

  const [betAmount, setBetAmount] = useState(getInitialBetAmount());
  const [selectedOption, setSelectedOption] = useState<string>(existingBet?.bet_option || '');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  // Update state when existing bet or balance changes
  useEffect(() => {
    if (isCancelled) {
      // If bet was just cancelled, keep default values
      const defaultAmount = initialBalance > 0 ? Math.min(Math.floor(initialBalance / 2), 10) : 10;
      setBetAmount(defaultAmount);
      setSelectedOption('');

      // Reset the cancelled flag after applying the changes
      setTimeout(() => setIsCancelled(false), 100);
    } else if (existingBet) {
      // We have an existing bet, use its values
      setBetAmount(Math.min(existingBet.amount, initialBalance));
      setSelectedOption(existingBet.bet_option);
    } else {
      // No existing bet, reset to defaults
      const defaultAmount = initialBalance > 0 ? Math.min(Math.floor(initialBalance / 2), 10) : 10;
      setBetAmount(defaultAmount);
      setSelectedOption('');
    }
  }, [existingBet, initialBalance, isCancelled]);

  return {
    betAmount,
    setBetAmount,
    selectedOption,
    setSelectedOption,
    isPlacingBet,
    setIsPlacingBet,
    isCancelled,
    setIsCancelled,
  };
};
