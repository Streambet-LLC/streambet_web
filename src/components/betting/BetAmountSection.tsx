import { Slider } from '@/components/ui/slider';
import { useEffect, useState, useRef } from 'react';

interface BetAmountSectionProps {
  betAmount: number;
  currentBalance: number;
  onBetAmountChange: (value: number) => void;
  existingBet?: {
    amount: number;
    bet_option: string;
    created_at: string;
    id: string;
    status: string;
    stream_id: string;
    updated_at: string;
    user_id: string;
  } | null;
  minBet?: number;
}

export const BetAmountSection = ({
  betAmount,
  currentBalance,
  onBetAmountChange,
  existingBet,
  minBet = 2,
}: BetAmountSectionProps) => {
  // Use local state with explicit initialization
  const [localAmount, setLocalAmount] = useState<number>(betAmount || 0);
  const [isSliding, setIsSliding] = useState(false);
  const lastCommittedAmount = useRef<number>(betAmount || 0);
  const slidingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (slidingTimeoutRef.current) {
        clearTimeout(slidingTimeoutRef.current);
      }
    };
  }, []);

  // Update local amount when parent amount changes and we're not sliding
  useEffect(() => {
    if (!isSliding && Math.abs(betAmount - lastCommittedAmount.current) > 0) {
      console.log('Slider: Updating local amount from parent:', betAmount);
      setLocalAmount(betAmount);
      lastCommittedAmount.current = betAmount;
    }
  }, [betAmount, isSliding]);

  // Initialize amount on first load or when currentBalance changes
  useEffect(() => {
    if (!existingBet && currentBalance > 0 && betAmount === 0) {
      const initialAmount = Math.floor(
        Math.max(Math.min(currentBalance / 2, currentBalance), minBet)
      );
      console.log('Slider: Setting initial amount:', initialAmount);
      onBetAmountChange(initialAmount);
      setLocalAmount(initialAmount);
      lastCommittedAmount.current = initialAmount;
    }
  }, [currentBalance, existingBet, onBetAmountChange, betAmount, minBet]);

  // Handle slider start to prevent external updates during sliding
  const handleSliderStart = () => {
    console.log('Slider: Movement started');
    setIsSliding(true);

    // Clear any existing timeout
    if (slidingTimeoutRef.current) {
      clearTimeout(slidingTimeoutRef.current);
    }
  };

  // Handle slider end to commit value to parent
  const handleSliderEnd = () => {
    console.log('Slider: Movement ended');

    // Validate final value
    const finalValue = Math.floor(Math.max(Math.min(localAmount, currentBalance), minBet));
    console.log('Slider: Committing final value:', finalValue);

    // Update parent with the final value
    onBetAmountChange(finalValue);
    lastCommittedAmount.current = finalValue;

    // Delay allowing external updates to ensure value is committed
    slidingTimeoutRef.current = setTimeout(() => {
      console.log('Slider: Sliding state cleared');
      setIsSliding(false);
    }, 200);
  };

  // Handle slider value changes
  const handleValueChange = (value: number[]) => {
    const newValue = Math.floor(Math.max(Math.min(value[0], currentBalance), minBet));
    setLocalAmount(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Bet {localAmount.toFixed(0)} Free Coins</h3>
      </div>
      <Slider
        value={[localAmount]}
        onValueChange={handleValueChange}
        onPointerDown={handleSliderStart}
        onPointerUp={handleSliderEnd}
        max={currentBalance}
        min={minBet}
        step={1}
        className="w-full my-4"
        aria-label="Bet amount"
      />
    </div>
  );
};
