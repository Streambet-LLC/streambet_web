import { Card } from '@/components/ui/card';
import { BetAmountSection } from './BetAmountSection';
import { BettingOptions } from './BettingOptions';
import { PlaceBetButton } from './PlaceBetButton';
import { useEffect, useState } from 'react';

interface CreateBetCardProps {
  betAmount: number;
  selectedOption: string;
  walletBalance: number;
  bettingOptions: string[];
  isPlacingBet: boolean;
  onBetAmountChange: (amount: number) => void;
  onOptionSelect: (option: string) => void;
  onPlaceBet: () => void;
}

export const CreateBetCard = ({
  betAmount,
  selectedOption,
  walletBalance,
  bettingOptions,
  isPlacingBet,
  onBetAmountChange,
  onOptionSelect,
  onPlaceBet,
}: CreateBetCardProps) => {
  const [isFormReady, setIsFormReady] = useState(false);

  // Validate form state
  useEffect(() => {
    setIsFormReady(betAmount > 0 && !!selectedOption);
  }, [betAmount, selectedOption]);

  // Ensure we have options to select from
  const availableOptions =
    Array.isArray(bettingOptions) && bettingOptions.length > 0
      ? bettingOptions
      : ['Option A', 'Option B'];

  return (
    <Card className="p-6 space-y-6">
      <BetAmountSection
        betAmount={betAmount}
        currentBalance={walletBalance}
        onBetAmountChange={onBetAmountChange}
        minBet={1}
      />

      <div className="space-y-4">
        <BettingOptions
          options={availableOptions}
          selectedOption={selectedOption}
          onOptionSelect={onOptionSelect}
        />

        <div className="flex flex-col gap-2">
          <PlaceBetButton
            isPlacingBet={isPlacingBet}
            disabled={isPlacingBet || !isFormReady}
            onClick={onPlaceBet}
          />
        </div>
      </div>
    </Card>
  );
};
