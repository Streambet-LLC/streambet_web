import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useCancelBet = (onBetCancelled: () => void) => {
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = useState(false);
  const queryClient = useQueryClient();

  const cancelBet = async (betId: string, streamId: string) => {
    if (!betId || !streamId) {
      console.error('Missing required information for cancelling bet:', { betId, streamId });
      toast({
        title: 'Error',
        description: 'Missing information for cancelling bet',
        variant: 'destructive',
      });
      return false;
    }

    setIsCancelling(true);
    console.log('Starting bet cancellation for bet:', betId, 'on stream:', streamId);

    try {
      // Get the bet details first to know the amount for refund
      const { data: betData, error: betError } = await supabase
        .from('stream_bets')
        .select('amount, user_id, bet_option')
        .eq('id', betId)
        .single();

      if (betError) {
        console.error('Error fetching bet details for cancellation:', betError);
        throw betError;
      }

      if (!betData) {
        console.error('Bet not found for cancellation');
        throw new Error('Bet not found');
      }

      const amount = betData.amount;
      const userId = betData.user_id;
      const betOption = betData.bet_option;

      console.log('Found bet for cancellation:', { amount, userId, betOption });

      // Get current user profile to know their username for the notification
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, wallet_balance')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile for bet cancellation:', profileError);
        throw profileError;
      }

      const username = profileData?.username || 'User';
      const currentBalance = profileData?.wallet_balance || 0;

      // Important: First delete the bet to ensure it no longer exists
      console.log('Deleting bet record:', betId);
      const { error: deleteError } = await supabase.from('stream_bets').delete().eq('id', betId);

      if (deleteError) {
        console.error('Error deleting bet:', deleteError);
        throw deleteError;
      }

      // Wait a moment to ensure deletion is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add funds back to user's wallet
      console.log('Returning funds to wallet. Current balance:', currentBalance, 'Adding:', amount);
      const { error: walletError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: currentBalance + amount,
        })
        .eq('id', userId);

      if (walletError) {
        console.error('Error returning funds to wallet:', walletError);
        throw walletError;
      }

      // Add a refund transaction - IMPORTANT: Use a valid transaction type
      const { error: transactionError } = await supabase.from('wallet_transactions').insert({
        user_id: userId,
        amount: amount, // Positive amount for refund
        type: 'deposit', // Changed from 'refund' to 'deposit' to match valid types
        description: `Refund for cancelled bet on ${betOption}`,
      });

      if (transactionError) {
        console.error('Error creating refund transaction:', transactionError);
        throw transactionError;
      }

      // Add a system comment for the bet cancellation
      const commentContent = `${username} cancelled their bet of ${amount} Free Coins on ${betOption}`;
      const { error: commentError } = await supabase.from('comments').insert({
        content: commentContent,
        user_id: 'system', // Use system identifier for cancellation notifications
        stream_id: streamId,
      });

      if (commentError) {
        console.error('Error creating cancellation comment:', commentError);
        // Not throwing here as this is not critical
      }

      // Force recalculate the total pot and update stream
      try {
        // Calculate new total from all remaining bets
        const { data: remainingBets, error: remainingError } = await supabase
          .from('stream_bets')
          .select('amount')
          .eq('stream_id', streamId)
          .eq('status', 'pending');

        if (!remainingError) {
          // Calculate the new sum
          const newTotal = remainingBets
            ? remainingBets.reduce((sum, bet) => sum + Number(bet.amount), 0)
            : 0;
          console.log(
            'Calculated new total after cancellation:',
            newTotal,
            'based on',
            remainingBets?.length || 0,
            'remaining bets'
          );

          // Update the stream's total_bets
          const { error: updateError } = await supabase
            .from('streams')
            .update({ total_bets: newTotal })
            .eq('id', streamId);

          if (updateError) {
            console.error('Error updating stream total_bets after cancellation:', updateError);
          } else {
            console.log('Updated stream total_bets to', newTotal);
          }
        } else {
          console.error('Error getting remaining bets:', remainingError);
        }
      } catch (err) {
        console.error('Unexpected error recalculating total pot:', err);
      }

      // IMPORTANT: Completely clear all relevant caches to ensure fresh data
      console.log('Clearing all caches related to betting');
      queryClient.removeQueries({
        queryKey: ['existing-bet'],
        exact: false,
      });

      queryClient.removeQueries({
        queryKey: ['stream-total-bets', streamId],
        exact: true,
      });

      queryClient.invalidateQueries({
        queryKey: ['profile', userId],
        exact: true,
        refetchType: 'all',
      });

      queryClient.invalidateQueries({
        queryKey: ['comments', streamId],
        exact: true,
        refetchType: 'all',
      });

      // CRITICAL: Wait a bit before calling the callback to ensure all updates have processed
      await new Promise(resolve => setTimeout(resolve, 200));

      // Call the callback to update the UI
      console.log('Calling onBetCancelled callback to update UI');
      onBetCancelled();

      toast({
        title: 'Bet cancelled',
        description: `Your bet has been cancelled and ${amount} Free Coins have been refunded to your wallet`,
      });

      return true;
    } catch (error: any) {
      console.error('Error in bet cancellation:', error);
      toast({
        title: 'Error cancelling bet',
        description: error?.message || 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsCancelling(false);
    }
  };

  return { cancelBet, isCancelling };
};
