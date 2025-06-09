import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BetUpdate {
  amount: number;
  bet_option: string;
}

export const useBetUpdates = (betId?: string, streamId?: string) => {
  const [betDetails, setBetDetails] = useState<BetUpdate | null>(null);
  const [totalPot, setTotalPot] = useState<number>(0);

  // Subscribe to specific bet updates
  useEffect(() => {
    if (!betId) return;

    console.log('Setting up bet updates subscription for:', betId);

    // Initial fetch of bet details
    const fetchBetDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('stream_bets')
          .select('amount, bet_option')
          .eq('id', betId)
          .single();

        if (error) {
          console.error('Error fetching bet details:', error);
          return;
        }

        if (data) {
          console.log('Initial bet details fetched:', data);
          setBetDetails({
            amount: data.amount,
            bet_option: data.bet_option,
          });
        }
      } catch (err) {
        console.error('Error fetching initial bet details:', err);
      }
    };

    fetchBetDetails();

    // Create a channel specifically for this bet ID
    const betChannel = supabase
      .channel(`bet_updates_${betId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stream_bets',
          filter: `id=eq.${betId}`,
        },
        (payload: any) => {
          console.log('Bet update event received in hook:', payload);
          if (payload.new) {
            console.log('Setting new bet details in hook:', payload.new);
            setBetDetails({
              amount: payload.new.amount,
              bet_option: payload.new.bet_option,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'stream_bets',
          filter: `id=eq.${betId}`,
        },
        (payload: any) => {
          console.log('Bet deletion event received for', betId, payload);
          setBetDetails(null);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up bet updates subscription');
      supabase.removeChannel(betChannel);
    };
  }, [betId]);

  // Subscribe to stream total pot updates
  useEffect(() => {
    if (!streamId) return;

    console.log('Setting up total pot subscription for stream:', streamId);

    // Initial fetch of total bets
    const fetchTotalBets = async () => {
      try {
        // Get the sum of all bets for this stream - include ALL bets, not just pending ones
        const { data, error } = await supabase
          .from('stream_bets')
          .select('amount')
          .eq('stream_id', streamId);

        if (error) {
          console.error('Error fetching total bets:', error);
          return;
        }

        if (data && data.length > 0) {
          const total = data.reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0);
          console.log('Calculated total pot from all bets:', total);
          setTotalPot(total);
        } else {
          console.log('No bets found for stream');
          setTotalPot(0);
        }
      } catch (err) {
        console.error('Error calculating total pot:', err);
      }
    };

    fetchTotalBets();

    // Subscribe to changes on the stream_bets table for this specific stream
    const betsChannel = supabase
      .channel(`stream_bets_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_bets',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload: any) => {
          console.log('Bet changes detected, refetching total bets. Payload:', payload);
          fetchTotalBets();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up stream bets subscription');
      supabase.removeChannel(betsChannel);
    };
  }, [streamId]);

  return { betDetails, totalPot };
};
