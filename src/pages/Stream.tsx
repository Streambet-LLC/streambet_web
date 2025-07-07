
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStreamData } from '@/hooks/useStreamData';
import { useStreamSubscriptions } from '@/hooks/useStreamSubscriptions';
import { useBetDeletionListener } from '@/hooks/useBetDeletionListener';
import { useAuthStateChangeHandler } from '@/hooks/useAuthStateChangeHandler';
import { StreamContent } from '@/components/stream/StreamContent';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Navigation } from '@/components/Navigation';
import api from '@/integrations/api/client';

const Stream = () => {
  const { id } = useParams();
  const streamId = id;
  // const streamId = 'ab58330d-e10c-433b-8b0b-df259a1878de';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pageVisibility, setPageVisibility] = useState(document.visibilityState);
  const refetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Query to get the current user session
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
    const sessionResponse = await supabase.auth.getSession();
      return sessionResponse;
    },
  });



  // Debounced refetch function to prevent excessive API calls
  const debouncedRefetch = (queryKey: string[], delay: number = 300) => {
    if (refetchTimerRef.current) {
      clearTimeout(refetchTimerRef.current);
    }

    refetchTimerRef.current = setTimeout(() => {
      console.log(`Debounced refetch for ${queryKey.join('/')}`);
      queryClient.invalidateQueries({
        queryKey,
        refetchType: 'active', // Only refetch active queries
      });
    }, delay);
  };

  // Track page visibility to refresh comments when returning to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      const wasHidden = pageVisibility === 'hidden';
      setPageVisibility(document.visibilityState);

      // If the page was hidden and is now visible, refresh comments
      if (wasHidden && document.visibilityState === 'visible' && streamId) {
        console.log('Page became visible, refreshing comments');
        debouncedRefetch(['comments', streamId], 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
    };
  }, [pageVisibility, queryClient, streamId]);

  // Invalidate relevant queries when user changes
  useEffect(() => {
    const currentUserId = session?.id;

    if (currentUserId !== prevUserIdRef.current) {
      console.log(
        'User changed from',
        prevUserIdRef.current,
        'to',
        currentUserId,
        'ensuring fresh data'
      );
      prevUserIdRef.current = currentUserId;

      // Reset and invalidate all relevant queries
      queryClient.resetQueries({
        queryKey: ['existing-bet'],
        exact: false,
      });

      debouncedRefetch(['comments', streamId], 100);

      if (currentUserId) {
        debouncedRefetch(['profile', currentUserId], 100);
      }

      debouncedRefetch(['stream-total-bets', streamId], 100);
    }
  }, [session?.id, streamId, queryClient]);

  // Watch for auth state changes
  // useEffect(() => {
  //   const {
  //     data: { subscription },
  //   } = supabase.auth.onAuthStateChange((event, newSession) => {
  //     console.log('Auth state changed:', event);
  //     if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
  //       prevUserIdRef.current = newSession?.id || null;

  //       // Invalidate all important queries on auth change
  //       queryClient.resetQueries({ queryKey: ['session'] });

  //       // Use progressive loading to avoid hammering the backend
  //       setTimeout(() => debouncedRefetch(['comments'], 300), 100);
  //       setTimeout(() => debouncedRefetch(['existing-bet'], 300), 200);
  //       setTimeout(() => debouncedRefetch(['stream-total-bets'], 300), 300);
  //       setTimeout(() => debouncedRefetch(['profile'], 300), 400);

  //       // Toast for better UX
  //       if (event === 'SIGNED_IN') {
  //         toast({
  //           title: 'Signed in successfully',
  //           description: 'Welcome back! You can now comment and place bets.',
  //         });
  //       }
  //     }
  //   });

  //   return () => subscription.unsubscribe();
  // }, [queryClient, streamId, toast]);

  // Get stream data
  const { data: stream, refetch } = useStreamData(streamId!);

 

  // Set up stream subscriptions
  // useStreamSubscriptions(streamId!, refetch);

  // Setup bet deletion listener
  // const { refreshKey } = useBetDeletionListener(streamId!, session?.id);

  // Setup auth change handler
  useAuthStateChangeHandler(streamId);

  // Mark initialization as complete and force a refresh of comments
  useEffect(() => {
    if (!isInitialized && !isSessionLoading && stream) {
      console.log('Stream page initialized, refreshing comments');
      setIsInitialized(true);

      // Force comments to refresh after initialization - with delay to prevent overloading
      setTimeout(() => {
        debouncedRefetch(['comments', streamId], 500);
      }, 500);
    }
  }, [isSessionLoading, stream, isInitialized, queryClient, streamId]);

  // if (!streamId) {
  //   console.error('No stream ID available');
  //   return null;
  // }



  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container pt-24 pb-8">
        <StreamContent
          streamId={streamId}
          session={session}
          stream={stream?.data}
          // refreshKey={refreshKey}
        />
      </main>
    </div>
  );
};

export default Stream;
