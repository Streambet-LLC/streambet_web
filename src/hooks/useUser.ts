import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface Session {
  user: User;
}

export function useUser() {
  const queryClient = useQueryClient();

  // Query for the session data
  const { data: session, isLoading: isLoadingSession } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await api.auth.getSession();
      return data.session;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Query for user profile data if we have a session
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null;
      return await api.user.getProfile();
    },
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Set up listener for authentication state changes - this is now handled differently
  useEffect(() => {
    // Set up a timer to refresh the session periodically
    const intervalId = setInterval(
      () => {
        queryClient.invalidateQueries({ queryKey: ['session'] });
      },
      1000 * 60 * 15
    ); // 15 minutes

    return () => clearInterval(intervalId);
  }, [queryClient]);

  const isLoading = isLoadingSession || (!!session && isLoadingProfile);

  return {
    user: session?.user || null,
    profile: profile || null,
    isLoading,
    isAdmin: profile?.data?.role === 'admin',
  };
}
