import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export const useBetPlacementHandler = (
  streamId: string,
  placeBet: (streamId: string, username?: string) => Promise<boolean>
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  const handlePlaceBet = async (profile: any) => {
    if (!profile) {
      toast({
        title: 'Error',
        description: 'Could not fetch your profile information',
        variant: 'destructive',
      });
      return;
    }

    if (profile.wallet_balance < 0) {
      toast({
        title: 'Insufficient funds',
        description: 'Please deposit more funds to place this bet',
        variant: 'destructive',
      });
      return;
    }

    try {
      const success = await placeBet(streamId, profile.username);

      if (success) {
        toast({
          title: 'Bet placed',
          description: 'Your bet has been placed successfully!',
        });

        // Reset retry counter on success
        setRetryCount(0);

        // More aggressive refresh strategy
        // Force refresh everything related to bets to ensure UI updates properly
        queryClient.invalidateQueries({
          queryKey: ['existing-bet'],
          exact: false,
        });

        queryClient.invalidateQueries({
          queryKey: ['stream-total-bets'],
          exact: false,
        });

        queryClient.invalidateQueries({
          queryKey: ['profile'],
          exact: false,
        });

        // Add multiple delayed refreshes to catch eventual consistency issues
        const refreshTimes = [500, 1500, 3000];
        refreshTimes.forEach(delay => {
          setTimeout(() => {
            console.log(`Running delayed refresh after ${delay}ms`);
            queryClient.refetchQueries({
              queryKey: ['existing-bet'],
              exact: false,
            });

            queryClient.refetchQueries({
              queryKey: ['stream-total-bets'],
              exact: false,
            });
          }, delay);
        });
      } else if (retryCount < 2) {
        // Auto-retry on failure up to 2 times
        setRetryCount(prev => prev + 1);
        toast({
          title: 'Retrying...',
          description: 'Having trouble connecting. Trying again automatically.',
        });

        setTimeout(() => {
          handlePlaceBet(profile);
        }, 1500);
      }
    } catch (error) {
      console.error('Error in handlePlaceBet:', error);
      toast({
        title: 'Connection problem',
        description: 'Network issue while placing bet. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return { handlePlaceBet };
};
