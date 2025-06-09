import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseBettingManagementProps {
  streamId: string;
  onUpdate: () => void;
}

export const useBettingManagement = ({ streamId, onUpdate }: UseBettingManagementProps) => {
  const { toast } = useToast();
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const handleLockBets = async () => {
    try {
      setProcessing(true);

      // First get all pending bets for this stream
      const { data: bets, error: betsError } = await supabase
        .from('stream_bets')
        .select('id, user_id, amount, bet_option')
        .eq('stream_id', streamId)
        .eq('status', 'pending');

      if (betsError) {
        console.error('Error fetching bets:', betsError);
        throw betsError;
      }

      console.log(`Processing ${bets?.length || 0} bets for locking`);

      // For each bet, deduct from user's wallet and create transaction
      if (bets && bets.length > 0) {
        for (const bet of bets) {
          // Get current user profile to update wallet balance
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', bet.user_id)
            .single();

          if (profileError) {
            console.error(`Error fetching profile for user ${bet.user_id}:`, profileError);
            continue; // Skip this bet if we can't get the profile
          }

          // Add transaction record
          const { error: transactionError } = await supabase.from('wallet_transactions').insert({
            user_id: bet.user_id,
            amount: -bet.amount,
            type: 'bet',
            description: `Bet on ${bet.bet_option}`,
          });

          if (transactionError) {
            console.error(`Error creating transaction for bet ${bet.id}:`, transactionError);
            continue;
          }

          // Update wallet balance
          const newBalance = (profileData.wallet_balance || 0) - bet.amount;
          if (newBalance < 0) {
            console.error(
              `Insufficient balance for user ${bet.user_id} to place bet of ${bet.amount}`
            );
            continue;
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', bet.user_id);

          if (updateError) {
            console.error(`Error updating balance for user ${bet.user_id}:`, updateError);
            continue;
          }

          console.log(`Successfully processed bet ${bet.id} for user ${bet.user_id}`);
        }
      }

      // Finally, lock the betting for the stream
      const { error } = await supabase
        .from('streams')
        .update({ betting_locked: true })
        .eq('id', streamId);

      if (error) {
        console.error('Error locking bets:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description:
          'Betting has been locked for this stream and wallet balances have been updated',
      });

      onUpdate();
    } catch (error: any) {
      console.error('Error locking bets:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to lock bets',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlockBets = async () => {
    try {
      setProcessing(true);

      // Update the stream to unlock betting without refunding bets
      const { error } = await supabase
        .from('streams')
        .update({
          betting_locked: false,
          betting_outcome: null,
        })
        .eq('id', streamId);

      if (error) {
        console.error('Error unlocking bets:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Betting has been unlocked for this stream',
      });

      onUpdate();
    } catch (error: any) {
      console.error('Error unlocking bets:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlock bets',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclareWinner = async () => {
    if (!selectedOutcome) {
      toast({
        title: 'Error',
        description: 'Please select a winning outcome',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      console.log('Processing payouts for stream:', streamId, 'winning option:', selectedOutcome);

      // Process payouts without ending the stream
      const response = await supabase.functions.invoke('process-payouts', {
        body: { streamId, winningOption: selectedOutcome },
      });

      if (response.error) {
        console.error('Payout error:', response.error);
        toast({
          title: 'Error processing payouts',
          description: 'There was an error processing payouts. Please try again.',
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      console.log('Payout response:', response.data);

      // Notify all users about the outcome
      toast({
        title: 'Success',
        description: `Winner declared: ${selectedOutcome}. Payouts processed.`,
      });

      onUpdate();
    } catch (error: any) {
      console.error('Error declaring winner:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to declare winner and process payouts',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return {
    selectedOutcome,
    setSelectedOutcome,
    processing,
    handleLockBets,
    handleUnlockBets,
    handleDeclareWinner,
  };
};
