import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { getMerchantId } from '@/config/coinflow';

interface CoinFlowFallbackProps {
  amount: string;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
  type: 'purchase' | 'withdraw';
}

export const CoinFlowFallbackComponent = ({ 
  amount, 
  isProcessing, 
  onProcessingChange,
  type
}: CoinFlowFallbackProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to proceed.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      onProcessingChange(true);

      // Simulate API call to backend
      const response = await fetch(`/api/coinflow/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          email: session?.user?.email,
          userId: session?.user?.id,
          type: type
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment session');
      }

      const data = await response.json();

      if (data?.url) {
        // Open CoinFlow in new window
        window.open(data.url, '_blank', 'width=500,height=700');
        
        toast({
          title: `CoinFlow ${type === 'purchase' ? 'Payment' : 'Withdrawal'}`,
          description: `${type === 'purchase' ? 'Payment' : 'Withdrawal'} window opened. Please complete your ${type}.`,
        });
      } else {
        throw new Error('No payment URL received');
      }

    } catch (error) {
      console.error(`Error creating ${type}:`, error);
      toast({
        title: 'Error',
        description: `Failed to initiate ${type}. Please try again.`,
        variant: 'destructive',
      });
      onProcessingChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <Button
        onClick={handlePayment}
        disabled={isLoading || isProcessing || !amount || Number(amount) <= 0}
        className="w-full"
        size="lg"
        variant={type === 'withdraw' ? 'outline' : 'default'}
      >
        {isLoading ? 'Processing...' : `${type === 'purchase' ? 'Pay' : 'Withdraw'} with CoinFlow - $${amount}`}
      </Button>
      
      <div className="text-sm text-muted-foreground text-center">
        Secure {type === 'purchase' ? 'payment' : 'withdrawal'} powered by CoinFlow
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        (Fallback mode - CoinFlow component unavailable)
      </div>
    </div>
  );
}; 