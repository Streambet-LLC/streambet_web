import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { PrizeConfiguration } from '@/types/prize';

/**
 * Hook to fetch active prize tiers (public endpoint)
 * Used by regular users to view prize progress
 */
export const usePrizeTiers = () => {
  return useQuery<PrizeConfiguration[]>({
    queryKey: ['prizeTiers'],
    queryFn: async () => {
      const data = await api.prize.getActivePrizeTiers();
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
};

/**
 * Hook to fetch prize tiers for admin (admin-only endpoint)
 * Used by admin users to manage prize configuration
 */
export const useAdminPrizeTiers = () => {
  return useQuery<PrizeConfiguration[]>({
    queryKey: ['adminPrizeTiers'],
    queryFn: async () => {
      const data = await api.prize.getAdminPrizeTiers();
      return data;
    },
    staleTime: 1 * 60 * 1000, // Cache for 1 minute (fresher data for admin)
    retry: 1,
  });
};

/**
 * Hook to fetch prize configuration history (admin-only endpoint)
 */
export const usePrizeHistory = () => {
  return useQuery<PrizeConfiguration[]>({
    queryKey: ['prizeHistory'],
    queryFn: async () => {
      const data = await api.prize.getPrizeHistory();
      return data;
    },
    staleTime: 1 * 60 * 1000,
    retry: 1,
  });
};
