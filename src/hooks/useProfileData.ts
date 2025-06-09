import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';

export const useProfileData = (userId: string) => {
  // Get user profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      console.log('Fetching profile for user:', userId);

      const data = await api.user.getProfile();

      console.log('Fetched profile:', data);
      return data;
    },
  });

  return {
    profile,
    isProfileLoading,
  };
};
