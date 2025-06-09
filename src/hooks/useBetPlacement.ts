import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePlaceBet } from './usePlaceBet';

export const useBetPlacement = (
  userId: string,
  streamId: string,
  refetchBet: () => Promise<any>
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { placeBet: placeBetFn } = usePlaceBet();

  const placeBet = useCallback(
    async (
      streamId: string,
      betAmount: number,
      selectedOption: string,
      existingBet: any,
      profile: any,
      username?: string
    ) => {
      console.log('Placing bet:', { streamId, betAmount, selectedOption, existingBet });

      try {
        if (!streamId) {
          console.error('Missing streamId for placing bet');
          toast({
            title: 'Error',
            description: 'Missing stream information. Please try again.',
            variant: 'destructive',
          });
          return false;
        }

        if (!betAmount || betAmount <= 0) {
          toast({
            title: 'Invalid amount',
            description: 'Please enter a bet amount greater than 0',
            variant: 'destructive',
          });
          return false;
        }

        if (!profile) {
          toast({
            title: 'Error',
            description: 'Could not load your profile. Please try again.',
            variant: 'destructive',
          });
          return false;
        }

        if (!profile?.wallet_balance || profile.wallet_balance < betAmount) {
          toast({
            title: 'Insufficient funds',
            description: 'Please deposit more funds to place this bet',
            variant: 'destructive',
          });
          return false;
        }

        if (!selectedOption) {
          toast({
            title: 'Selection required',
            description: 'Please select a betting option',
            variant: 'destructive',
          });
          return false;
        }

        // Add log for existing bet vs new bet
        console.log('Bet type:', existingBet ? 'Updating existing bet' : 'Creating new bet');

        const success = await placeBetFn({
          streamId,
          userId,
          betAmount,
          selectedOption,
          walletBalance: profile.wallet_balance,
          existingBetId: existingBet?.id,
          onSuccess: async () => {
            // Refresh all related data
            await refetchBet();
            // Add slight delays between queries to prevent flooding
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['existing-bet'] });
            }, 100);
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['stream-total-bets'] });
            }, 200);
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['profile', userId] });
            }, 300);
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['comments', streamId] });
            }, 400);
          },
          username: profile?.username,
        });

        return success;
      } catch (error) {
        console.error('Error in placeBet:', error);
        toast({
          title: 'Error placing bet',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [userId, toast, placeBetFn, refetchBet, queryClient]
  );

  return { placeBet };
};
