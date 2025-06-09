import { useToast } from '@/components/ui/use-toast';

export const validateBetPlacement = (
  selectedOption: string,
  betAmount: number,
  walletBalance: number,
  toast: ReturnType<typeof useToast>['toast']
): boolean => {
  if (!selectedOption) {
    toast({
      title: 'Selection required',
      description: 'Please select a betting option',
      variant: 'destructive',
    });
    return false;
  }

  if (betAmount <= 0) {
    toast({
      title: 'Invalid amount',
      description: 'Please enter a valid bet amount',
      variant: 'destructive',
    });
    return false;
  }

  if (betAmount > walletBalance) {
    toast({
      title: 'Insufficient funds',
      description: 'Please deposit more funds to place this bet',
      variant: 'destructive',
    });
    return false;
  }

  return true;
};
