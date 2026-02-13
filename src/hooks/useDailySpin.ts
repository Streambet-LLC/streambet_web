import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from '@/integrations/api/client';
import { SpinStatusResponse, SpinResultResponse } from '@/types/daily-spin';
import { toast } from '@/hooks/use-toast';

/**
 * Hook to fetch daily spin status
 * Checks if user can spin and provides timing information
 */
export const useDailySpinStatus = () => {
  return useQuery<SpinStatusResponse>({
    queryKey: ['dailySpinStatus'],
    queryFn: () => api.dailySpin.getStatus(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
};

/**
 * Hook to execute daily spin
 * Returns mutation with onSuccess and onError callbacks
 */
export const useExecuteDailySpin = () => {
  const queryClient = useQueryClient();

  return useMutation<SpinResultResponse, AxiosError<{ message: string }>>({
    mutationFn: () => api.dailySpin.executeSpin(),
    onSuccess: () => {
      // Invalidate spin status to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['dailySpinStatus'] });
      
      // Invalidate wallet balance to update displayed balance
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (error) => {
      // Show error toast
      const errorMessage = error?.response?.data?.message || 'Failed to complete spin. Please try again.';
      toast({
        title: 'Spin Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });
};
