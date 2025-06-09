import { useToast } from '@/components/ui/use-toast';
import { validateBetPlacement } from '@/utils/betValidation';
import { updateStreamTotalBets } from '@/utils/betDatabaseOperations';
import { handleExistingBet, handleNewBet } from '@/services/betService';

interface PlaceBetParams {
  streamId: string;
  userId: string;
  betAmount: number;
  selectedOption: string;
  walletBalance: number;
  existingBetId?: string;
  onSuccess: () => void;
  username?: string;
}

export const usePlaceBet = () => {
  const { toast } = useToast();

  const placeBet = async ({
    streamId,
    userId,
    betAmount,
    selectedOption,
    walletBalance,
    existingBetId,
    onSuccess,
    username,
  }: PlaceBetParams) => {
    // Validate bet first
    if (!validateBetPlacement(selectedOption, betAmount, walletBalance, toast)) {
      return false;
    }

    try {
      let success: boolean;

      if (existingBetId) {
        // Update existing bet
        success = await handleExistingBet({
          betId: existingBetId,
          streamId,
          betAmount,
          selectedOption,
          username,
          toast,
        });
      } else {
        // Place new bet
        success = await handleNewBet({
          streamId,
          userId,
          betAmount,
          selectedOption,
          walletBalance,
          username,
          toast,
        });
      }

      if (success) {
        // Update streams table total_bets regardless of bet type
        await updateStreamTotalBets(streamId);
        onSuccess();
      }

      return success;
    } catch (error) {
      console.error('Error in placeBet:', error);
      toast({
        title: 'Error placing bet',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { placeBet };
};
