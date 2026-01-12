import { toast } from '@/hooks/use-toast';

/**
 * Standard error handler for mutations
 * Extracts error message from API response and displays a toast
 */
export const handleMutationError = (error: any, fallbackMessage: string) => {
  const errorMessage = 
    error?.response?.data?.message || 
    error?.message || 
    fallbackMessage;
  
  toast({
    title: 'Error',
    description: errorMessage,
    variant: 'destructive',
  });
};
