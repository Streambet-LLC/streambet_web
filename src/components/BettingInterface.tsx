import { useEffect, useRef, useState } from 'react';
import { BettingInterfaceContainer } from './betting/BettingInterfaceContainer';
import { useBettingStreamUpdates } from '@/hooks/useBettingStreamUpdates';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface BettingInterfaceProps {
  session: any;
  stream: any;
  streamId: string;
}

export const BettingInterface = ({ session, stream, streamId }: BettingInterfaceProps) => {
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const refreshAttemptCountRef = useRef(0);
  const lastRefreshTimeRef = useRef(0);
  const [hasActiveRequests, setHasActiveRequests] = useState(false);
  const pendingBetsKeyRef = useRef(`pending-bets-${streamId}-${userId}`);

  // Track active requests to prevent overlapping
  useEffect(() => {
    // Add global request monitoring
    const originalFetch = window.fetch;
    let activeRequests = 0;

    window.fetch = function (...args) {
      // Only monitor Supabase requests
      if (typeof args[0] === 'string' && args[0].includes('supabase')) {
        activeRequests++;
        setHasActiveRequests(true);

        return originalFetch
          .apply(this, args)
          .then(response => {
            activeRequests--;
            if (activeRequests === 0) {
              setHasActiveRequests(false);
            }
            return response;
          })
          .catch(err => {
            activeRequests--;
            if (activeRequests === 0) {
              setHasActiveRequests(false);
            }
            throw err;
          });
      }

      return originalFetch.apply(this, args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Set up stream updates with aggressive rate limits
  const { invalidationEnabled } = useBettingStreamUpdates(streamId, userId, {
    initialDelay: 5000,
    refreshInterval: 30000,
    rateLimit: 15000,
  });

  // Function to safely refresh data with enhanced rate limiting
  const safeRefresh = () => {
    const now = Date.now();
    // Extreme rate limiting to 15 seconds minimum between refreshes
    if (now - lastRefreshTimeRef.current < 15000 || hasActiveRequests) {
      console.log('Skipping refresh due to strict rate limiting or active requests');
      return;
    }

    lastRefreshTimeRef.current = now;
    refreshAttemptCountRef.current += 1;

    try {
      // Use a more gentle approach with refetchQueries instead of invalidateQueries
      // And use staggered requests to avoid overwhelming the API
      setTimeout(() => {
        if (!invalidationEnabled) return;

        queryClient.refetchQueries({
          queryKey: ['existing-bet', userId, streamId],
          exact: true,
        });
      }, 1000);

      // Add a delay before the second query
      setTimeout(() => {
        if (!invalidationEnabled) return;

        queryClient.refetchQueries({
          queryKey: ['stream-total-bets', streamId],
          exact: true,
        });
      }, 3000);

      // Reset counter after successful refresh
      refreshAttemptCountRef.current = 0;
    } catch (error) {
      console.error('Error during safe refresh:', error);

      if (refreshAttemptCountRef.current > 3) {
        toast({
          title: 'Connection issue',
          description:
            "Having trouble connecting to the server. We'll keep trying with reduced frequency.",
          variant: 'destructive',
        });
      }
    }
  };

  // Force refresh existing bet data when component mounts, but with much less frequency
  useEffect(() => {
    if (!userId || !streamId || !invalidationEnabled) return;

    console.log(
      'BettingInterface mounted, performing initial data refresh with extreme rate limiting'
    );

    // Generate a session-specific cache key for pending bets to avoid conflicts
    pendingBetsKeyRef.current = `pending-bets-${streamId}-${userId}-${Date.now()}`;

    // Delay initial fetch even longer to prevent resource issues at page load
    const initialTimeout = setTimeout(() => {
      if (!hasActiveRequests) {
        safeRefresh();
      }
    }, 7000); // Increased to 7 seconds

    // Set up a very infrequent refresh interval
    const refreshInterval = setInterval(() => {
      if (!hasActiveRequests) {
        safeRefresh();
      }
    }, 60000); // Only check once per minute

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(refreshInterval);
    };
  }, [streamId, userId, queryClient, toast, hasActiveRequests, invalidationEnabled]);

  return (
    <BettingInterfaceContainer
      session={session}
      stream={stream}
      streamId={streamId}
      pendingBetsKey={pendingBetsKeyRef.current}
    />
  );
};
