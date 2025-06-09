import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAuthStateChangeHandler = (streamId?: string) => {
  useEffect(() => {
    if (!streamId) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, cleaning up pending bets');

        try {
          // First get any existing bet to log the amount
          const { data: existingBet } = await supabase
            .from('stream_bets')
            .select('amount')
            .eq('stream_id', streamId)
            .eq('status', 'pending')
            .maybeSingle();

          if (existingBet) {
            console.log('Found pending bet to clean up:', existingBet);

            // Use RPC to update the total correctly
            await supabase.rpc('decrement_stream_total_bets', {
              p_stream_id: streamId,
              p_amount: existingBet.amount,
            });

            // Delete the bet
            const { error: deleteError } = await supabase
              .from('stream_bets')
              .delete()
              .eq('stream_id', streamId)
              .eq('status', 'pending');

            if (deleteError) {
              console.error('Error deleting bet on logout:', deleteError);
            } else {
              console.log('Successfully cleaned up pending bet');
            }
          }
        } catch (error) {
          console.error('Error cleaning up bet on logout:', error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [streamId]);
};
