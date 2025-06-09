import { Button } from '@/components/ui/button';
import { useBetUpdates } from '@/hooks/useBetUpdates';
import { useEffect, useState } from 'react';
import { useCancelBet } from '@/hooks/useCancelBet';
import { useToast } from '@/components/ui/use-toast';

interface BetSummaryProps {
  betAmount: number;
  selectedOption: string;
  existingBetId?: string;
  streamId?: string;
  onBetCancelled: () => void;
}

export const BetSummary = ({
  betAmount,
  selectedOption,
  existingBetId,
  streamId,
  onBetCancelled,
}: BetSummaryProps) => {
  const { betDetails } = useBetUpdates(existingBetId, streamId);
  const [displayAmount, setDisplayAmount] = useState(betAmount);
  const [displayOption, setDisplayOption] = useState(selectedOption);
  const { cancelBet, isCancelling } = useCancelBet(onBetCancelled);
  const { toast } = useToast();

  // Initialize display with props
  useEffect(() => {
    setDisplayAmount(betAmount);
    setDisplayOption(selectedOption);
  }, [betAmount, selectedOption]);

  // Update from hook data
  useEffect(() => {
    if (betDetails) {
      console.log('Real-time bet update received in BetSummary:', betDetails);
      setDisplayAmount(betDetails.amount);
      setDisplayOption(betDetails.bet_option);
    }
  }, [betDetails]);

  const handleCancelBet = async () => {
    if (!existingBetId || !streamId) {
      console.error('Missing required information for cancellation:', {
        existingBetId,
        streamId,
      });

      toast({
        title: 'Error',
        description: 'Could not cancel bet due to missing information',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Attempting to cancel bet:', existingBetId);
      await cancelBet(existingBetId, streamId);
    } catch (error) {
      console.error('Error in handleCancelBet:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel bet. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="bet-status-card">
      <div className="text-center space-y-2">
        <p className="text-lg">
          Your bet is <span className="font-bold">{displayAmount.toFixed(0)} Free Coins</span> on
          option <span className="font-bold">{displayOption}</span>
        </p>
        <p className="text-sm text-muted-foreground">Good luck!</p>
      </div>

      <div className="space-y-2">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleCancelBet}
          disabled={isCancelling}
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Bet'}
        </Button>
      </div>
    </div>
  );
};
