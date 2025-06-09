import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBetRealtimeSubscription = (
  streamId: string,
  setLocalTotal: (value: number) => void,
  refetch: () => void
) => {
  // Track channel references for proper cleanup
  const channelsRef = useRef<any[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  const lastRefetchTimeRef = useRef<number>(0);
  const cachedTotalRef = useRef<number | null>(null);
  const fetchInProgressRef = useRef<boolean>(false);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!streamId) {
      console.error('No streamId provided for total pot subscription');
      return;
    }

    console.log('Setting up total pot subscription for stream:', streamId);

    // Create a unique, stable channel name
    const channelName = `total_pot_${streamId}_${Date.now()}`;

    // Track last update time to prevent too frequent updates
    const MIN_UPDATE_INTERVAL = 10000; // 10 seconds minimum between updates
    const MIN_REFETCH_INTERVAL = 15000; // 15 seconds minimum between refetches

    // Function to get the latest accurate total from the database
    const fetchAndSetLatestTotal = async () => {
      // Skip if already fetching to prevent parallel requests
      if (fetchInProgressRef.current) {
        return;
      }

      const now = Date.now();
      // Rate limit fetch calls
      if (now - lastUpdateTimeRef.current < MIN_UPDATE_INTERVAL) {
        console.log('Skipping fetch due to rate limiting. Using cached value if available.');
        if (cachedTotalRef.current !== null) {
          setLocalTotal(cachedTotalRef.current);
        }
        return;
      }

      lastUpdateTimeRef.current = now;
      fetchInProgressRef.current = true;

      try {
        // Only fetch if component is still mounted
        console.log('Fetching latest bet total from database for stream:', streamId);

        // First try to get from streams table for efficiency
        const { data: streamData, error: streamError } = await supabase
          .from('streams')
          .select('total_bets')
          .eq('id', streamId)
          .single();

        if (!streamError && streamData && typeof streamData.total_bets === 'number') {
          cachedTotalRef.current = streamData.total_bets;
          setLocalTotal(streamData.total_bets);
          fetchInProgressRef.current = false;
          return;
        }

        // If we have a cached value and had an error getting new data, use the cache
        if (streamError && cachedTotalRef.current !== null) {
          console.log('Using cached total due to stream fetch error');
          setLocalTotal(cachedTotalRef.current);
          fetchInProgressRef.current = false;
          return;
        }

        // Fallback: recalculate from all bets
        const { data: betsData, error } = await supabase
          .from('stream_bets')
          .select('amount, status')
          .eq('stream_id', streamId)
          .eq('status', 'pending');

        if (error) {
          console.error('Error fetching bets for total calculation:', error);
          if (cachedTotalRef.current !== null) {
            setLocalTotal(cachedTotalRef.current);
          }
          fetchInProgressRef.current = false;
          return;
        }

        const calculatedSum =
          betsData?.reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0) || 0;

        console.log(
          'Calculated sum from bets:',
          calculatedSum,
          'based on',
          betsData?.length || 0,
          'bets'
        );

        // Update cache and local state immediately for responsive UI
        cachedTotalRef.current = calculatedSum;
        setLocalTotal(calculatedSum);

        // Update streams table for consistency - but with longer throttling time
        const lastDbUpdate = localStorage.getItem('lastDbTotalUpdate_' + streamId);
        const lastDbUpdateTime = lastDbUpdate ? parseInt(lastDbUpdate) : 0;

        if (now - lastDbUpdateTime > 30000) {
          // Only update DB every 30 seconds at most
          try {
            await supabase.from('streams').update({ total_bets: calculatedSum }).eq('id', streamId);

            console.log('Updated streams.total_bets to match calculated sum:', calculatedSum);
            localStorage.setItem('lastDbTotalUpdate_' + streamId, now.toString());
          } catch (updateErr) {
            console.error('Failed to update streams.total_bets:', updateErr);
          }
        } else {
          console.log('Skipping DB update due to throttling');
        }
      } catch (err) {
        console.error('Unexpected error calculating total pot:', err);
        if (cachedTotalRef.current !== null) {
          setLocalTotal(cachedTotalRef.current);
        }
      } finally {
        fetchInProgressRef.current = false;
      }
    };

    // Initial fetch to start with correct data, with delay to prevent API hammering
    setTimeout(() => {
      fetchAndSetLatestTotal();
    }, 2000);

    // Helper function to debounce refetches
    const debouncedRefetch = () => {
      const now = Date.now();
      if (now - lastRefetchTimeRef.current < MIN_REFETCH_INTERVAL) {
        return;
      }
      lastRefetchTimeRef.current = now;
      refetch();
    };

    // Create a single channel that listens for both stream and bet changes
    const channel = supabase
      .channel(channelName)
      // Listen for stream updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${streamId}`,
        },
        payload => {
          console.log('Stream update detected in TotalPot:', payload);
          if (payload.new && typeof payload.new.total_bets !== 'undefined') {
            const newTotal = Number(payload.new.total_bets);
            if (!isNaN(newTotal) && newTotal >= 0) {
              console.log('Setting local total from stream update:', newTotal);
              cachedTotalRef.current = newTotal;
              setLocalTotal(newTotal);
            }
          }
        }
      )
      // Listen for bet changes with a single subscription for all bet events
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_bets',
          filter: `stream_id=eq.${streamId}`,
        },
        payload => {
          console.log('Bet change detected in TotalPot:', payload.eventType);

          // Debounce multiple rapid changes
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'UPDATE' ||
            payload.eventType === 'DELETE'
          ) {
            // Use debounced refetch for consistency
            debouncedRefetch();

            // For critical events, ensure we update immediately
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              // Use a small delay to avoid multiple recalculations if events come in batches
              setTimeout(() => {
                // Check rate limiting again
                const now = Date.now();
                if (
                  now - lastUpdateTimeRef.current >= MIN_UPDATE_INTERVAL &&
                  !fetchInProgressRef.current
                ) {
                  fetchAndSetLatestTotal();
                }
              }, 1000);
            }
          }
        }
      )
      .subscribe(status => {
        console.log(`Total pot subscription status: ${status}`);
      });

    channelsRef.current.push(channel);

    // Set up a less frequent polling interval as a fallback
    const pollInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 30000 && !fetchInProgressRef.current) {
        // Only poll if no update in 30 seconds
        fetchAndSetLatestTotal();
      }
    }, 60000); // Poll every 60 seconds

    return () => {
      console.log('Cleaning up total pot subscriptions');
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      clearInterval(pollInterval);
    };
  }, [streamId, refetch, setLocalTotal]);
};
