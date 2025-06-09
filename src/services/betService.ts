import { useToast } from '@/components/ui/use-toast';
import {
  updateExistingBet,
  createNewBet,
  checkExistingBet,
  createBetComment,
  updateWalletForBet,
  updateStreamTotalBets,
} from '@/utils/betDatabaseOperations';
import { validateBetPlacement } from '@/utils/betValidation';

interface HandleExistingBetParams {
  betId: string;
  streamId: string;
  betAmount: number;
  selectedOption: string;
  username?: string;
  toast: ReturnType<typeof useToast>['toast'];
}

interface HandleNewBetParams {
  streamId: string;
  userId: string;
  betAmount: number;
  selectedOption: string;
  walletBalance: number;
  username?: string;
  toast: ReturnType<typeof useToast>['toast'];
}

export const handleExistingBet = async ({
  betId,
  streamId,
  betAmount,
  selectedOption,
  username,
  toast,
}: HandleExistingBetParams): Promise<boolean> => {
  try {
    // Update existing bet
    await updateExistingBet({ betId, betAmount, selectedOption });

    // Create a system comment for the bet update
    await createBetComment({
      streamId,
      username: username || 'User',
      betAmount,
      selectedOption,
      isUpdate: true,
    });

    toast({
      title: 'Bet updated successfully!',
      description: `Your bet has been updated to ${betAmount} Free Coins on ${selectedOption}`,
    });

    return true;
  } catch (error) {
    console.error('Error updating bet:', error);
    toast({
      title: 'Error updating bet',
      description: 'Please try again',
      variant: 'destructive',
    });
    return false;
  }
};

export const handleNewBet = async ({
  streamId,
  userId,
  betAmount,
  selectedOption,
  walletBalance,
  username,
  toast,
}: HandleNewBetParams): Promise<boolean> => {
  try {
    // First check if a bet already exists for this user and stream
    const existingBet = await checkExistingBet(userId, streamId);

    if (existingBet) {
      console.log('Existing bet found, updating instead of creating new:', existingBet);
      // If a bet already exists, update it instead
      return await handleExistingBet({
        betId: existingBet.id,
        streamId,
        betAmount,
        selectedOption,
        username,
        toast,
      });
    }

    // Place new bet
    await createNewBet({ streamId, userId, betAmount, selectedOption });

    // Update wallet
    await updateWalletForBet({ userId, betAmount, walletBalance, selectedOption });

    // Create a system comment for the new bet
    await createBetComment({
      streamId,
      username: username || 'User',
      betAmount,
      selectedOption,
      isUpdate: false,
    });

    toast({
      title: 'Bet placed successfully!',
      description: `${betAmount} Free Coins has been placed on ${selectedOption}`,
    });

    return true;
  } catch (error) {
    console.error('Error placing new bet:', error);

    // Check if this is a constraint error (bet already exists)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      toast({
        title: 'Already betting',
        description: 'You already have a pending bet on this stream',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Error placing bet',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
    return false;
  }
};
