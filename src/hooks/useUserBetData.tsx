import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserBet {
  amount: number;
  option: string;
}

export const useUserBetData = (streamId: string) => {
  const [userBet, setUserBet] = useState<UserBet | null>(null);
  const queryClient = useQueryClient();
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Get current user
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  // Fetch existing bet if user is logged in
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !streamId) {
      // Clear state if user is not logged in
      setUserBet(null);
      return;
    }

    console.log('useUserBetData: Setting up bet tracking for user:', userId, 'stream:', streamId);

    const fetchUserBet = async () => {
      // Record when this fetch happened
      lastUpdateTimeRef.current = Date.now();
      const fetchTime = lastUpdateTimeRef.current;

      try {
        const { data, error } = await supabase
          .from('stream_bets')
          .select('id, amount, bet_option, status')
          .eq('user_id', userId)
          .eq('stream_id', streamId)
          .eq('status', 'pending')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          // Not found error
          console.error('Error fetching user bet:', error);
          return;
        }

        // Only update state if this is the most recent fetch
        if (fetchTime >= lastUpdateTimeRef.current) {
          if (data && data.status === 'pending') {
            console.log('Found existing bet for user:', data);
            setUserBet({
              amount: Number(data.amount),
              option: data.bet_option,
            });
          } else {
            console.log('No existing bet found for user');
            setUserBet(null);
          }
        } else {
          console.log(
            'Ignoring stale fetch result from',
            fetchTime,
            'current is',
            lastUpdateTimeRef.current
          );
        }
      } catch (err) {
        console.error('Unexpected error in fetchUserBet:', err);
        // In case of error, clear the user bet to avoid showing incorrect data
        setUserBet(null);
      }
    };

    fetchUserBet();

    // Set up real-time subscription for this user's bets
    const channel = supabase
      .channel(`user_bet_updates_${userId}_${streamId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_bets',
          filter: `user_id=eq.${userId} AND stream_id=eq.${streamId}`,
        },
        payload => {
          console.log('User bet update detected in useUserBetData:', payload);
          lastUpdateTimeRef.current = Date.now();

          // For DELETE events, set userBet to null immediately
          if (payload.eventType === 'DELETE') {
            console.log('Bet deletion detected, clearing userBet state');
            setUserBet(null);

            // Also invalidate related queries
            queryClient.invalidateQueries({
              queryKey: ['existing-bet', userId, streamId],
            });

            queryClient.invalidateQueries({
              queryKey: ['stream-total-bets', streamId],
              refetchType: 'all',
            });
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // For insert or update, set the new bet data
            if (payload.new && payload.new.status === 'pending') {
              console.log('New bet data received:', payload.new);
              setUserBet({
                amount: Number(payload.new.amount),
                option: payload.new.bet_option,
              });
            } else if (payload.new && payload.new.status !== 'pending') {
              // If status is not pending, clear the bet
              console.log('Bet is no longer pending, clearing state');
              setUserBet(null);
            }
          } else {
            // For other events, fetch the latest data
            fetchUserBet();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up user bet subscription');
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, streamId, queryClient]);

  return { userBet };
};
