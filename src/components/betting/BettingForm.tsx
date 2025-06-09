import { Card } from '@/components/ui/card';
import { CreateBetCard } from './CreateBetCard';
import { BetSummary } from './BetSummary';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

interface BettingFormProps {
  session: any;
  stream: any;
  streamId: string;
  betAmount: number;
  selectedOption: string;
  isPlacingBet: boolean;
  existingBet: any;
  profile: any;
  onBetAmountChange: (amount: number) => void;
  onOptionSelect: (option: string) => void;
  onPlaceBet: () => void;
  onBetCancelled: () => void;
}

export const BettingForm = ({
  session,
  stream,
  streamId,
  betAmount,
  selectedOption,
  isPlacingBet,
  existingBet,
  profile,
  onBetAmountChange,
  onOptionSelect,
  onPlaceBet,
  onBetCancelled,
}: BettingFormProps) => {
  const { toast } = useToast();

  // Validate existingBet to ensure it's valid
  useEffect(() => {
    if (existingBet && (!existingBet.id || !existingBet.status)) {
      console.warn('Invalid existing bet data detected:', existingBet);
    }
  }, [existingBet]);

  // Show bet summary if user has placed a bet
  if (existingBet) {
    console.log('Rendering bet summary with:', existingBet);
    try {
      return (
        <BetSummary
          betAmount={existingBet.amount}
          selectedOption={existingBet.bet_option}
          existingBetId={existingBet.id}
          streamId={streamId}
          onBetCancelled={onBetCancelled}
        />
      );
    } catch (error) {
      console.error('Error rendering BetSummary:', error);
      toast({
        title: 'Display Error',
        description: 'There was an error displaying your bet. Please refresh the page.',
        variant: 'destructive',
      });

      // Force bet cancellation on rendering error
      onBetCancelled();
    }
  }

  return (
    <CreateBetCard
      betAmount={betAmount}
      selectedOption={selectedOption}
      walletBalance={profile?.wallet_balance || 0}
      bettingOptions={stream?.betting_options || []}
      isPlacingBet={isPlacingBet}
      onBetAmountChange={onBetAmountChange}
      onOptionSelect={onOptionSelect}
      onPlaceBet={onPlaceBet}
    />
  );
};
